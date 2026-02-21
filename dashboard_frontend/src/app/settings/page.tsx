"use client";

import { useAuth } from "@/components/AuthWrapper";

export default function SettingsPage() {
    const { channelName, logout } = useAuth();

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">
            <h2 className="text-text-main font-bold text-lg">Settings</h2>

            {/* Channel Info */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6">
                <h3 className="text-text-main font-bold text-sm mb-4">Channel Information</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between py-2 border-b border-border-subtle/50">
                        <span className="text-text-muted text-sm">Channel Name</span>
                        <span className="text-text-main font-mono text-sm">{channelName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border-subtle/50">
                        <span className="text-text-muted text-sm">Network</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-text-main font-mono text-sm">Solana Devnet</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-text-muted text-sm">Dashboard Version</span>
                        <span className="text-text-main font-mono text-sm">1.0.0</span>
                    </div>
                </div>
            </div>

            {/* Account Actions */}
            <div className="bg-surface rounded-xl border border-border-subtle p-6">
                <h3 className="text-text-main font-bold text-sm mb-4">Account</h3>
                <button
                    onClick={logout}
                    className="px-6 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
}
