"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/StatCard";
import { TimelineChart } from "@/components/TimelineChart";
import { useAuth } from "@/components/AuthWrapper";

export default function Home() {
  const { analyticsData } = useAuth();

  if (!analyticsData) return null;

  const { overview, rawTips, wordCloud, videoBreakdown } = analyticsData;

  // Most recent tippers (max 5)
  const recentTips = rawTips.slice(0, 5);

  // Use backend word cloud data, falling back to client-side extraction from memos
  let wordCloudWords: Array<{ word: string; count: number }> = [];
  if (wordCloud && wordCloud.length > 0) {
    wordCloudWords = wordCloud;
  } else {
    // Build word cloud client-side from rawTips memos
    const freq: Record<string, number> = {};
    rawTips.forEach((tip) => {
      if (tip.memo && tip.memo.trim()) {
        tip.memo.split(/\s+/).forEach((raw) => {
          const w = raw.toLowerCase().replace(/[^a-z']/g, "");
          if (w.length > 2) freq[w] = (freq[w] || 0) + 1;
        });
      }
    });
    wordCloudWords = Object.entries(freq)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  const maxCount = wordCloudWords.length > 0 ? Math.max(...wordCloudWords.map((w) => w.count)) : 1;

  // Fetch YouTube durations for all tipped videos and compute weighted average watch time
  const [avgWatchTime, setAvgWatchTime] = useState("--:--");
  useEffect(() => {
    const videoIds = videoBreakdown.map(v => v.videoId).filter(Boolean);
    if (videoIds.length === 0) { setAvgWatchTime("0:00"); return; }

    const YT_KEY = "AIzaSyC2InG1ez8F9NupDgb9aGy9DPGkHQ2Sq4A";
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(",")}&key=${YT_KEY}`)
      .then(r => r.json())
      .then(data => {
        const durationMap: Record<string, number> = {};
        data.items?.forEach((item: { id: string; contentDetails?: { duration?: string } }) => {
          const match = item.contentDetails?.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            durationMap[item.id] = parseInt(match[1] || "0") * 3600 + parseInt(match[2] || "0") * 60 + parseInt(match[3] || "0");
          }
        });

        // For each video: avg_tipper_time (capped at video duration) / video_duration
        let totalWeightedRatio = 0;
        let videosWithDuration = 0;
        videoBreakdown.forEach(v => {
          const vidDuration = durationMap[v.videoId];
          if (vidDuration && vidDuration > 0 && v.tipsCount > 0) {
            const rawAvg = v.totalTimeSpent / v.tipsCount;
            const cappedAvg = Math.min(rawAvg, vidDuration);
            totalWeightedRatio += cappedAvg / vidDuration;
            videosWithDuration++;
          }
        });

        const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

        if (videosWithDuration > 0) {
          // Average ratio across all videos, then express as avg_time / avg_duration
          const avgRatio = totalWeightedRatio / videosWithDuration;
          // Also compute overall avg duration for display
          const allDurations = videoBreakdown.map(v => durationMap[v.videoId]).filter(Boolean);
          const avgDuration = Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length);
          const avgTime = Math.round(avgRatio * avgDuration);
          setAvgWatchTime(`${fmtTime(avgTime)} / ${fmtTime(avgDuration)}`);
        } else {
          setAvgWatchTime("0:00");
        }
      })
      .catch(() => setAvgWatchTime("N/A"));
  }, [videoBreakdown]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-10">

      {/* Top Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total SOL" value={overview.totalSolEarned.toFixed(2)} highlight />
        <StatCard label="Tip Count" value={overview.totalTipsReceived.toString()} />
        <StatCard label="Total Views" value={overview.totalViewsOnTippedVideos.toLocaleString()} />
        <StatCard label="Avg Tip Amount" value={overview.averageTipAmount.toFixed(2)} />
        <StatCard label="Avg Watch Time" value={avgWatchTime} />
      </div>

      {/* Middle Chart */}
      <TimelineChart />

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-6">

        {/* Tipper Breakdown */}
        <div className="bg-surface rounded-xl border border-border-subtle p-6 flex flex-col gap-4 max-h-[400px] overflow-y-auto hide-scrollbar">
          <h3 className="text-text-main font-bold text-sm mb-2">Tipper Breakdown</h3>

          <div className="flex flex-col gap-4">
            {recentTips.length === 0 ? (
              <p className="text-text-muted text-sm italic">No recent tips found.</p>
            ) : (
              recentTips.map((tip, idx) => (
                <div key={idx} className={`flex flex-col gap-2 ${idx !== recentTips.length - 1 ? 'pb-4 border-b border-border-subtle/50' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-text-main text-sm">
                      {tip.tipper_address.substring(0, 4)}...{tip.tipper_address.substring(tip.tipper_address.length - 4)}
                    </span>
                    <span className="font-mono text-accent-green font-bold text-sm">{Number(tip.sol_amount).toFixed(2)} SOL</span>
                  </div>
                  {tip.memo && <p className="text-text-muted text-sm italic">&quot;{tip.memo}&quot;</p>}
                  <div className="flex items-center gap-4 text-text-muted text-xs mt-1">
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      Duration: {tip.duration_spent ? `${tip.duration_spent}s` : 'N/A'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Word Cloud */}
        <div className="bg-surface rounded-xl border border-border-subtle p-6 flex flex-col justify-between max-h-[400px]">
          <h3 className="text-text-main font-bold text-sm mb-4">Message Word Cloud</h3>

          <div className="flex-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-center overflow-hidden">
            {wordCloudWords.length === 0 ? (
              <p className="text-text-muted text-sm italic">No messages yet — words will appear as tippers leave memos.</p>
            ) : (
              wordCloudWords.map((item, idx) => {
                // Size based on word frequency relative to max
                const ratio = item.count / maxCount;
                const sizeClass =
                  ratio > 0.8 ? "text-5xl" :
                    ratio > 0.6 ? "text-4xl" :
                      ratio > 0.4 ? "text-3xl" :
                        ratio > 0.2 ? "text-2xl" : "text-xl";

                const colors = ["text-accent-purple", "text-accent-green", "text-text-main"];
                const weights = ["font-medium", "font-bold", "font-black"];

                const color = colors[idx % colors.length];
                const weight = weights[idx % weights.length];
                const opacity = color === "text-text-main" ? "opacity-70" : "";

                return (
                  <span key={idx} className={`${color} ${sizeClass} ${weight} ${opacity} transition-transform hover:scale-110 cursor-default`} title={`Used ${item.count} time${item.count > 1 ? 's' : ''}`}>
                    {item.word}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
