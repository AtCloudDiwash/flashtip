"use client";

import { AIChat } from "@/components/AIPanel";

export default function InsightsPage() {
    return (
        <div className="h-[calc(100vh-140px)] w-full flex flex-col">
            <AIChat isFull={true} />
        </div>
    );
}
