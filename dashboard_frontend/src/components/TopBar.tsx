'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthWrapper';

export function TopBar() {
    const pathname = usePathname();
    const [time, setTime] = useState('');
    const { channelName } = useAuth();

    // Update clock every second
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' AM'); // Pseudo AM/PM for design accuracy if preferred, or just local format
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Determine title based on pathname
    let title = "Video Statistics";
    if (pathname === '/') {
        title = "Overview";
    } else if (pathname === '/videos') {
        title = "Video Collection";
    } else if (pathname.startsWith('/videos/')) {
        title = "Video Statistics";
    } else if (pathname === '/audience') {
        title = "Audience";
    } else if (pathname === '/transactions') {
        title = "Transactions";
    } else if (pathname === '/insights') {
        title = "AI Insights";
    } else if (pathname === '/settings') {
        title = "Settings";
    }

    return (
        <div className="h-[60px] w-full border-b border-border-subtle flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex-1">
                <h1 className="text-lg font-bold text-text-main">{title}</h1>
            </div>

            <div className="flex items-center gap-6">
                {/* TPS Counter */}
                <div className="flex items-center gap-2 text-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent-green" strokeWidth="2">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    <span className="text-text-muted">TPS:</span>
                    <span className="text-accent-green font-mono">2,925</span>
                </div>

                {/* Block */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Block:</span>
                    <span className="text-text-main font-mono">234,568,077</span>
                </div>

                {/* Channel Name Pill */}
                <div className="flex items-center gap-2 bg-surface-deep border border-border-subtle rounded-full pl-2 pr-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-accent-green" />
                    <span className="text-xs font-mono text-text-main">{channelName || "Logged Out"}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-muted hover:text-text-main cursor-pointer" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </div>

                {/* Live Clock */}
                <div className="text-text-muted font-mono text-xs w-[80px] text-right">
                    {time}
                </div>
            </div>
        </div>
    );
}
