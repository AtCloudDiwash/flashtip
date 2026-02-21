export function AIPanel() {
    const suggestions = [
        "Which video performed best?",
        "Show top tippers this month",
        "Analyze watch time patterns",
        "Predict next month earnings"
    ];

    return (
        <div className="w-[300px] h-screen bg-surface border-l border-border-subtle flex flex-col shrink-0">
            {/* Header */}
            <div className="p-6 pb-4 flex items-center gap-3">
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
            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-2">
                <div className="bg-surface-deep border border-border-subtle rounded-xl rounded-tl-sm p-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] gradient-primary" />
                    <p className="text-sm text-text-main leading-relaxed">
                        Hey! I'm your Flash Tip analytics assistant. Ask me anything about your tip data, trends, or audience behavior.
                    </p>
                </div>
            </div>

            {/* Suggestion Chips */}
            <div className="p-6 pb-2 flex flex-col gap-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        className="w-full text-left px-4 py-2.5 rounded-full border border-border-subtle bg-surface-deep text-text-muted text-[13px] hover:border-accent-purple/50 hover:text-text-main transition-colors"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ask anything..."
                        className="w-full bg-surface-deep border border-border-subtle rounded-xl py-3 pl-4 pr-12 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center hover:opacity-90 transition-opacity">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
