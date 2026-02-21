"use client";

import { useAuth } from "@/components/AuthWrapper";

export default function TransactionsPage() {
    const { analyticsData } = useAuth();

    if (!analyticsData) return null;

    const { rawTips } = analyticsData;

    // Sort by most recent first
    const sortedTips = [...rawTips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-text-main font-bold text-lg">All Transactions</h2>
                <span className="text-text-muted text-sm font-mono">{sortedTips.length} total</span>
            </div>

            {/* Transactions Table */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-text-muted text-xs border-b border-border-subtle">
                            <th className="text-left py-3 font-medium">Date</th>
                            <th className="text-left py-3 font-medium">From</th>
                            <th className="text-right py-3 font-medium">Amount</th>
                            <th className="text-left py-3 font-medium pl-6">Memo</th>
                            <th className="text-left py-3 font-medium">Signature</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTips.map((tip, idx) => (
                            <tr key={tip.id || idx} className="border-b border-border-subtle/50 hover:bg-surface-deep/50 transition-colors">
                                <td className="py-3 text-text-muted whitespace-nowrap">
                                    {new Date(tip.created_at).toLocaleDateString()}{" "}
                                    <span className="text-xs">{new Date(tip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="py-3 font-mono text-text-main">
                                    {tip.tipper_address.substring(0, 4)}...{tip.tipper_address.substring(tip.tipper_address.length - 4)}
                                </td>
                                <td className="py-3 text-right font-mono text-accent-green font-bold whitespace-nowrap">
                                    {Number(tip.sol_amount).toFixed(4)} SOL
                                </td>
                                <td className="py-3 pl-6 text-text-muted italic max-w-[200px] truncate">
                                    {tip.memo || "—"}
                                </td>
                                <td className="py-3 font-mono text-text-muted text-xs">
                                    {tip.signature ? (
                                        <a
                                            href={`https://explorer.solana.com/tx/${tip.signature}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-accent-purple transition-colors"
                                        >
                                            {tip.signature.substring(0, 8)}...
                                        </a>
                                    ) : "—"}
                                </td>
                            </tr>
                        ))}
                        {sortedTips.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-text-muted italic">No transactions yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
