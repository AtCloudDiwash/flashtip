"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface OverviewData {
    channelName: string;
    totalTipsReceived: number;
    totalSolEarned: number;
    totalTimeSpentSeconds: number;
    highestTipReceived: number;
    totalViewsOnTippedVideos: number;
    totalLikesOnTippedVideos: number;
    averageTipAmount: number;
}

interface VideoData {
    videoId: string;
    videoLink: string;
    title?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
    publishedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    tipsCount: number;
    totalSolEarned: number;
    totalTimeSpent: number;
    topTip: number;
    memos: Array<{ amount: number; memo: string; tipper: string; date: string }>;
}

interface RawTip {
    id: string;
    created_at: string;
    tipper_address: string;
    creator_address: string;
    sol_amount: number;
    memo?: string;
    duration_spent?: number;
    video_link?: string;
    signature?: string;
    channel_name?: string;
    network?: string;
}

interface AnalyticsData {
    overview: OverviewData;
    videoBreakdown: VideoData[];
    rawTips: RawTip[];
    wordCloud: Array<{ word: string; count: number }>;
}

interface AuthContextType {
    isLoggedIn: boolean;
    channelName: string;
    analyticsData: AnalyticsData | null;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isLoggedIn: false,
    channelName: "",
    analyticsData: null,
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [channelName, setChannelName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

    // Load token from localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem("flash_tip_token");
        const storedChannel = localStorage.getItem("flash_tip_channel");
        if (token && storedChannel) {
            setChannelName(storedChannel);
            fetchDashboardData(token);
        }
    }, []);

    const fetchDashboardData = async (token: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/data`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({}), // channelName is inferred from JWT on backend
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    logout();
                    throw new Error("Session expired. Please login again.");
                }
                throw new Error("Failed to fetch dashboard data");
            }

            const { data } = await res.json();
            if (!data) {
                throw new Error("No data found for this channel");
            }

            setAnalyticsData(data);
            setIsLoggedIn(true);
        } catch (err: any) {
            setError(err.message || "Failed to fetch data");
            setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelName, password }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Invalid credentials");
            }

            const { token, channelName: verifiedChannel } = await res.json();
            
            localStorage.setItem("flash_tip_token", token);
            localStorage.setItem("flash_tip_channel", verifiedChannel);
            setChannelName(verifiedChannel);
            
            await fetchDashboardData(token);
        } catch (err: any) {
            setError(err.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("flash_tip_token");
        localStorage.removeItem("flash_tip_channel");
        setIsLoggedIn(false);
        setChannelName("");
        setPassword("");
        setAnalyticsData(null);
    };

    if (!isLoggedIn) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0d0d14] p-4 font-sans">
                <div className="w-full max-w-md bg-[#13141f] rounded-xl border border-[rgba(255,255,255,0.07)] p-8 shadow-2xl flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#9945ff] to-[#14f195] text-white flex items-center justify-center rounded-xl text-2xl font-black mb-2 shadow-lg shadow-[#9945ff]/20">
                            ⚡
                        </div>
                        <h1 className="text-2xl font-bold text-[#e2e8f7]">Flash Tip Dashboard</h1>
                        <p className="text-[#4a5578] text-sm text-center">Analyze your tipping metrics securely</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#e2e8f7] text-sm font-medium">Channel Name</label>
                            <input
                                type="text"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                placeholder="Ex: MyCryptoChannel"
                                className="w-full bg-[#0b0c15] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-3 outline-none focus:border-[#9945ff] text-[#e2e8f7] placeholder-[#4a5578] transition-colors"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#e2e8f7] text-sm font-medium">Dashboard Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter access code"
                                className="w-full bg-[#0b0c15] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-3 outline-none focus:border-[#9945ff] text-[#e2e8f7] placeholder-[#4a5578] transition-colors"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center mt-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full bg-gradient-to-r from-[#9945ff] to-[#14f195] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#9945ff]/20"
                        >
                            {loading ? "Authenticating..." : "Access Dashboard"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ isLoggedIn, channelName, analyticsData, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
