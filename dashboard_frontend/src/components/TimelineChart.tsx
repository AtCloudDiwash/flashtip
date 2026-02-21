'use client';

import { useEffect, useState } from 'react';

export function TimelineChart() {
    const [bars, setBars] = useState<{ x: number; height: number; color: string }[]>([]);

    useEffect(() => {
        // Generate dummy data based on the prompt
        // "Bars alternate between purple (#9945ff) and green (#14f195), randomly distributed across the timeline."
        const generated = Array.from({ length: 40 }).map((_, i) => ({
            x: Math.random() * 100, // percentage position
            height: 20 + Math.random() * 80, // percentage height
            color: i % 2 === 0 ? 'bg-accent-purple' : 'bg-accent-green',
        }));
        setBars(generated);
    }, []);

    return (
        <div className="bg-surface rounded-xl border border-border-subtle p-6 w-full">
            <h3 className="text-text-main font-bold text-sm mb-6">Tip Timeline — When do viewers tip?</h3>

            <div className="relative h-[120px] mb-4">
                {/* Gridlines */}
                <div className="absolute top-0 w-full h-full flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-t border-text-muted" />
                    <div className="border-t border-text-muted" />
                    <div className="border-t border-text-muted" />
                    <div className="border-t border-text-muted" />
                </div>

                {/* Chart Area */}
                <div className="absolute top-0 left-0 w-full h-full flex items-end px-2">
                    {bars.map((bar, i) => (
                        <div
                            key={i}
                            className={`absolute bottom-0 w-[3px] rounded-t-sm ${bar.color} hover:brightness-125 transition-all cursor-pointer`}
                            style={{ left: `${bar.x}%`, height: `${bar.height}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* X-Axis */}
            <div className="flex justify-between text-text-muted text-xs font-mono">
                <span>0:00</span>
                <span>7:00</span>
                <span>15:00</span>
                <span>23:00</span>
                <span>30:47</span>
            </div>
        </div>
    );
}
