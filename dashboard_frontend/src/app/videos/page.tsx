"use client";

import { VideoCard } from "@/components/VideoCard";
import { useAuth } from "@/components/AuthWrapper";
import { useState, useMemo } from "react";

export default function Videos() {
    const { analyticsData } = useAuth();
    const [sortBy, setSortBy] = useState<"tipped" | "recent" | "watched">("tipped");
    const [search, setSearch] = useState("");

    if (!analyticsData) return null;

    const videos = useMemo(() => {
        let list = [...analyticsData.videoBreakdown];

        // Filter by search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(v => (v.title || "").toLowerCase().includes(q) || v.videoId.includes(q));
        }

        // Sort
        if (sortBy === "tipped") {
            list.sort((a, b) => b.totalSolEarned - a.totalSolEarned);
        } else if (sortBy === "recent") {
            list.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
        } else if (sortBy === "watched") {
            list.sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        return list;
    }, [analyticsData.videoBreakdown, sortBy, search]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">

            {/* Top Controls Row */}
            <div className="flex justify-between items-center bg-surface border border-border-subtle rounded-xl p-3">
                {/* Filters */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortBy("tipped")}
                        className={`font-bold text-[13px] px-6 py-2 rounded-full transition-colors ${sortBy === "tipped" ? "gradient-primary text-white" : "text-text-muted hover:text-text-main"}`}
                    >
                        Most Tipped
                    </button>
                    <button
                        onClick={() => setSortBy("recent")}
                        className={`font-bold text-[13px] px-6 py-2 rounded-full transition-colors ${sortBy === "recent" ? "gradient-primary text-white" : "text-text-muted hover:text-text-main"}`}
                    >
                        Most Recent
                    </button>
                    <button
                        onClick={() => setSortBy("watched")}
                        className={`font-bold text-[13px] px-6 py-2 rounded-full transition-colors ${sortBy === "watched" ? "gradient-primary text-white" : "text-text-muted hover:text-text-main"}`}
                    >
                        Most Watched
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search videos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-surface-deep border border-border-subtle rounded-full py-2 pl-10 pr-4 text-sm w-[240px] text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
                    />
                </div>
            </div>

            {/* Grid of Video Cards */}
            {videos.length === 0 ? (
                <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                    <p className="text-text-muted text-sm">No tipped videos found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.videoId}
                            videoId={video.videoId}
                            title={video.title || `Video ${video.videoId}`}
                            solAmount={video.totalSolEarned.toFixed(2)}
                            tipCount={video.tipsCount.toString()}
                            thumbnailUrl={video.thumbnailUrl}
                            views={video.views}
                            likes={video.likes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
