"use client";

import { useAuth } from "@/components/AuthWrapper";
import { useMemo } from "react";

export default function AudiencePage() {
    const { analyticsData } = useAuth();

    if (!analyticsData) return null;

    const { rawTips } = analyticsData;

    // Get unique tippers with their total SOL and tip count
    const tipperStats = useMemo(() => {
        const map: Record<string, { address: string; totalSol: number; tipCount: number; lastTip: string }> = {};
        rawTips.forEach((tip) => {
            const addr = tip.tipper_address;
            if (!map[addr]) {
                map[addr] = { address: addr, totalSol: 0, tipCount: 0, lastTip: tip.created_at };
            }
            map[addr].totalSol += Number(tip.sol_amount) || 0;
            map[addr].tipCount++;
            if (tip.created_at > map[addr].lastTip) {
                map[addr].lastTip = tip.created_at;
            }
        });
        return Object.values(map).sort((a, b) => b.totalSol - a.totalSol);
    }, [rawTips]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface rounded-xl border border-border-subtle p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary" />
                    <div className="text-text-muted text-[13px] mb-2">Unique Tippers</div>
                    <div className="text-text-main text-4xl font-bold font-mono">{tipperStats.length}</div>
                </div>
                <div className="bg-surface rounded-xl border border-border-subtle p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-subtle" />
                    <div className="text-text-muted text-[13px] mb-2">Total Tips</div>
                    <div className="text-text-main text-4xl font-bold font-mono">{rawTips.length}</div>
                </div>
                <div className="bg-surface rounded-xl border border-border-subtle p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-subtle" />
                    <div className="text-text-muted text-[13px] mb-2">Avg Tips/Tipper</div>
                    <div className="text-text-main text-4xl font-bold font-mono">
                        {tipperStats.length > 0 ? (rawTips.length / tipperStats.length).toFixed(1) : "0"}
                    </div>
                </div>
            </div>

            {/* Top Tippers Table */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6">
                <h3 className="text-text-main font-bold text-sm mb-4">Top Tippers</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-muted text-xs border-b border-border-subtle">
                                <th className="text-left py-3 font-medium">#</th>
                                <th className="text-left py-3 font-medium">Wallet Address</th>
                                <th className="text-right py-3 font-medium">Tips Sent</th>
                                <th className="text-right py-3 font-medium">Total SOL</th>
                                <th className="text-right py-3 font-medium">Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tipperStats.map((tipper, idx) => (
                                <tr key={tipper.address} className="border-b border-border-subtle/50 hover:bg-surface-deep/50 transition-colors">
                                    <td className="py-3 font-mono text-text-muted">{idx + 1}</td>
                                    <td className="py-3 font-mono text-text-main">
                                        {tipper.address.substring(0, 6)}...{tipper.address.substring(tipper.address.length - 6)}
                                    </td>
                                    <td className="py-3 text-right font-mono text-accent-purple font-bold">{tipper.tipCount}</td>
                                    <td className="py-3 text-right font-mono text-accent-green font-bold">{tipper.totalSol.toFixed(4)}</td>
                                    <td className="py-3 text-right text-text-muted">{new Date(tipper.lastTip).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {tipperStats.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-text-muted italic">No tippers yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
