"use client";

export default function InsightsPage() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
            <div className="bg-surface rounded-xl border border-border-subtle p-10 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                {/* AI Icon */}
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-2 shadow-lg shadow-accent-purple/20">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <h2 className="text-text-main font-bold text-xl">AI Insights</h2>
                <p className="text-text-muted text-sm text-center max-w-md leading-relaxed">
                    Use the <span className="text-accent-purple font-semibold">Flash Tip AI</span> panel on the right to ask questions about your tip data, audience behavior, and earnings trends.
                </p>
                <div className="flex items-center gap-2 mt-4 text-text-muted text-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>Try asking: &quot;Which video earned the most tips?&quot;</span>
                </div>
            </div>
        </div>
    );
}
