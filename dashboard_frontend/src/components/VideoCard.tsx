'use client';

import Link from 'next/link';

export function VideoCard({
    videoId,
    title,
    solAmount,
    tipCount,
    thumbnailUrl,
    views,
    likes,
}: {
    videoId: string;
    title: string;
    solAmount: string;
    tipCount: string;
    thumbnailUrl?: string;
    views?: number;
    likes?: number;
}) {
    return (
        <Link href={`/videos/${videoId}`} className="block group">
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden transition-all duration-300 group-hover:border-accent-purple/50 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)] h-[340px] flex flex-col">
                {/* YouTube Thumbnail or Placeholder */}
                <div className="h-[190px] bg-surface-deep flex items-center justify-center shrink-0 relative overflow-hidden">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a5578" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    )}
                    {/* Play overlay */}
                    {thumbnailUrl && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                    <h3 className="text-text-main font-bold text-[15px] leading-tight mb-2 line-clamp-2">{title}</h3>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="border border-accent-green/30 text-accent-green bg-accent-green/10 text-xs font-bold px-2 py-0.5 rounded">
                            {solAmount} SOL
                        </div>
                        <div className="border border-accent-purple/30 text-accent-purple bg-accent-purple/10 text-xs font-bold px-2 py-0.5 rounded">
                            {tipCount} tips
                        </div>
                        {views !== undefined && (
                            <div className="border border-border-subtle text-text-muted text-xs font-mono px-2 py-0.5 rounded">
                                {views.toLocaleString()} views
                            </div>
                        )}
                        {likes !== undefined && (
                            <div className="border border-border-subtle text-text-muted text-xs font-mono px-2 py-0.5 rounded">
                                {likes.toLocaleString()} ♥
                            </div>
                        )}
                    </div>

                    {/* Sparkline pseudo-chart */}
                    <div className="mt-auto opacity-50 relative h-6 overflow-hidden">
                        <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full stroke-accent-purple" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M0,15 Q10,5 20,12 T40,10 T60,18 T80,8 T100,14" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
