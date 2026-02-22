"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthWrapper";
import { usePathname } from "next/navigation";

interface Message {
    role: "user" | "ai";
    content: string;
}

const WELCOME_MESSAGE: Message = {
    role: "ai",
    content: "Hey! I'm your Flash Tip analytics assistant. Ask me anything about your tip data, trends, or audience behavior."
};

export function AIChat({ isFull = false }: { isFull?: boolean }) {
    const { analyticsData } = useAuth();
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        "Which video performed best?",
        "Show top tippers this month",
        "Analyze watch time patterns",
        "Predict next month earnings"
    ];

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const token = localStorage.getItem("flash_tip_token");
                if (!token) return;
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/history`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) return;
                const { messages: history } = await res.json();
                if (history && history.length > 0) {
                    setMessages([WELCOME_MESSAGE, ...history]);
                }
            } catch (err) {
                console.error("Failed to load chat history:", err);
            }
        };
        loadHistory();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async (text: string) => {
        if (!text || !text.trim() || loading) return;

        const userMsg: Message = { role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const token = localStorage.getItem("flash_tip_token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    message: text,
                    context: analyticsData // Pass full analytics data for context
                })
            });

            if (!res.ok) throw new Error("AI request failed");

            const { reply } = await res.json();
            setMessages(prev => [...prev, { role: "ai", content: reply }]);
        } catch (err: any) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, { role: "ai", content: "Sorry, I ran into an error. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={scrollRef} className={`${isFull ? 'h-full w-full max-w-4xl mx-auto' : 'w-[350px] h-screen'} bg-surface border-l border-border-subtle flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-all`}>
            {/* Header */}
            <div className="p-6 pb-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <div>
                    <h2 className="font-bold text-text-main text-[15px]">Flash Tip AI</h2>
                    <p className="text-text-muted text-xs">Your personal creator analyst</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="p-6 pt-2 flex flex-col gap-4 flex-1">
                {messages.map((msg, i) => (
                    <div 
                        key={i} 
                        className={`p-4 rounded-xl relative overflow-hidden text-sm leading-relaxed ${
                            msg.role === 'ai' 
                            ? 'bg-surface-deep border border-border-subtle rounded-tl-sm self-start w-[95%]' 
                            : 'bg-accent-purple/10 border border-accent-purple/20 text-text-main rounded-tr-sm self-end max-w-[90%]'
                        }`}
                    >
                        {msg.role === 'ai' && <div className="absolute left-0 top-0 bottom-0 w-[2px] gradient-primary" />}
                        <p className={msg.role === 'ai' ? "text-text-main" : ""}>{msg.content}</p>
                    </div>
                ))}

                {/* Suggestion Chips */}
                {messages.length <= 1 && (
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-text-muted text-[11px] uppercase tracking-wider font-bold mb-1 ml-1">Suggestions</p>
                        <div className={`grid ${isFull ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-2'}`}>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSend(suggestion)}
                                    disabled={loading}
                                    className="w-full text-left px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-deep text-text-muted text-[13px] hover:border-accent-purple/50 hover:text-text-main transition-colors disabled:opacity-50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex gap-2 p-4 text-text-muted text-xs animate-pulse">
                        Thinking...
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-4 shrink-0">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    className="relative"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        disabled={loading}
                        className="w-full bg-surface-deep border border-border-subtle rounded-xl py-3 pl-4 pr-12 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors disabled:opacity-50"
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

export function AIPanel() {
    const pathname = usePathname();
    
    // Hide the sidebar panel when on the insights page
    if (pathname === "/insights") return null;

    return <AIChat />;
}
