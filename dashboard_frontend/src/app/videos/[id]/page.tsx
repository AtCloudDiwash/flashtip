'use client';

import Link from 'next/link';
import { StatCard } from "@/components/StatCard";
import { TimelineChart } from "@/components/TimelineChart";
import { useAuth } from "@/components/AuthWrapper";
import { use, useState, useEffect } from 'react';

export default function SingleVideo({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { analyticsData } = useAuth();

    if (!analyticsData) return null;

    // Find the video from the videoBreakdown by videoId
    const video = analyticsData.videoBreakdown.find(v => v.videoId === resolvedParams.id);

    if (!video) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
                <Link href="/videos" className="text-text-muted hover:text-text-main text-sm font-medium transition-colors flex items-center gap-2 w-fit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Videos
                </Link>
                <div className="bg-surface rounded-xl border border-border-subtle p-12 text-center">
                    <p className="text-text-muted text-lg">Video not found.</p>
                </div>
            </div>
        );
    }

    const videoTitle = video.title || `Video ${video.videoId}`;
    const uniqueTippers = new Set(video.memos.map(m => m.tipper)).size;

    // Compute average watch time for this video
    const rawAvgSec = video.tipsCount > 0 ? Math.round(video.totalTimeSpent / video.tipsCount) : 0;
    const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // Fetch video duration from YouTube API
    const [videoDuration, setVideoDuration] = useState<number | null>(null);
    useEffect(() => {
        const YT_KEY = process.env.NEXT_PUBLIC_YT_API_KEY;
        fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${video.videoId}&key=${YT_KEY}`)
            .then(r => r.json())
            .then(data => {
                if (data.items?.[0]?.contentDetails?.duration) {
                    // Parse ISO 8601 duration (PT#H#M#S)
                    const match = data.items[0].contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                    if (match) {
                        const h = parseInt(match[1] || "0");
                        const m = parseInt(match[2] || "0");
                        const s = parseInt(match[3] || "0");
                        setVideoDuration(h * 3600 + m * 60 + s);
                    }
                }
            })
            .catch(() => { });
    }, [video.videoId]);

    // Cap avg watch time at the video's actual duration (duration_spent can exceed
    // video length if the user leaves the tab open before tipping)
    const avgSec = videoDuration ? Math.min(rawAvgSec, videoDuration) : rawAvgSec;
    const avgWatchTime = videoDuration
        ? `${fmtTime(avgSec)} / ${fmtTime(videoDuration)}`
        : fmtTime(avgSec);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">

            {/* Breadcrumb */}
            <div>
                <Link href="/videos" className="text-text-muted hover:text-text-main text-sm font-medium transition-colors flex items-center gap-2 w-fit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Videos
                </Link>
            </div>

            {/* Hero Card */}
            <div className="h-[360px] rounded-xl overflow-hidden relative flex flex-col justify-end">
                {/* Thumbnail or placeholder */}
                {video.thumbnailUrl ? (
                    <img
                        src={video.thumbnailUrl}
                        alt={videoTitle}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-surface-deep flex items-center justify-center">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#4a5578" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-[240px] bg-gradient-to-t from-[#0d0d14] via-[#0d0d14]/80 to-transparent pointer-events-none" />

                {/* Title and Underline */}
                <div className="relative z-10 p-8 pt-0">
                    <h1 className="text-4xl font-bold text-white mb-4 shadow-sm">{videoTitle}</h1>
                    <div className="w-[80px] h-1 rounded-full gradient-primary" />
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-5 gap-4">
                <StatCard label="Total SOL" value={video.totalSolEarned.toFixed(2)} highlight />
                <StatCard label="Tip Count" value={video.tipsCount.toString()} />
                <StatCard label="Views" value={(video.views || 0).toLocaleString()} />
                <StatCard label="Likes" value={(video.likes || 0).toLocaleString()} />
                <StatCard label="Avg Watch Time" value={avgWatchTime} />
            </div>

            {/* Timeline Chart */}
            <TimelineChart />

            {/* Memos Section */}
            {video.memos.length > 0 && (
                <div className="bg-surface rounded-xl border border-border-subtle p-6">
                    <h3 className="text-text-main font-bold text-sm mb-4">Messages from Tippers ({video.memos.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto hide-scrollbar">
                        {video.memos.map((m, idx) => (
                            <div key={idx} className={`flex flex-col gap-1 ${idx !== video.memos.length - 1 ? 'pb-3 border-b border-border-subtle/50' : ''}`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-text-main text-sm">
                                        {m.tipper.substring(0, 4)}...{m.tipper.substring(m.tipper.length - 4)}
                                    </span>
                                    <span className="font-mono text-accent-green font-bold text-sm">{m.amount.toFixed(2)} SOL</span>
                                </div>
                                <p className="text-text-muted text-sm italic">&quot;{m.memo}&quot;</p>
                                <span className="text-text-muted text-xs">{new Date(m.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
