const { fetchTipsForChannel, executeSql } = require("../services/supabase");
const { fetchVideoStats } = require("../services/youtube");
const { extractVideoId } = require("../utils/youtube");

const getDashboardData = async (req, res) => {
    try {
        const channelName = req.user?.channelName || req.params.channelName;
        if (!channelName) {
            return res.status(401).json({ error: "Missing channel name" });
        }

        const tips = await fetchTipsForChannel(channelName);
        if (!tips || tips.length === 0) {
            return res.json({ success: true, message: "No data found for this creator.", data: null });
        }

        const videoMap = {};
        let totalSol = 0;
        let totalTimeSpent = 0;
        let highestTip = 0;

        tips.forEach(tip => {
            totalSol += Number(tip.sol_amount) || 0;
            totalTimeSpent += Number(tip.duration_spent) || 0;
            const currentTipAmount = Number(tip.sol_amount) || 0;
            if (currentTipAmount > highestTip) highestTip = currentTipAmount;

            const vId = extractVideoId(tip.video_link);
            if (vId) {
                if (!videoMap[vId]) {
                    videoMap[vId] = {
                        videoId: vId,
                        videoLink: tip.video_link,
                        tipsCount: 0,
                        totalSolEarned: 0,
                        totalTimeSpent: 0,
                        topTip: 0,
                        memos: []
                    };
                }
                videoMap[vId].tipsCount++;
                videoMap[vId].totalSolEarned += currentTipAmount;
                videoMap[vId].totalTimeSpent += Number(tip.duration_spent) || 0;

                if (currentTipAmount > videoMap[vId].topTip) {
                    videoMap[vId].topTip = currentTipAmount;
                }
                if (tip.memo) {
                    videoMap[vId].memos.push({ amount: currentTipAmount, memo: tip.memo, tipper: tip.tipper_address, date: tip.created_at });
                }
            }
        });

        const videoIds = Object.keys(videoMap);
        const ytVideos = await fetchVideoStats(videoIds);
        
        let totalViews = 0;
        let totalLikes = 0;

        ytVideos.forEach(item => {
            const vId = item.id;
            const stats = item.statistics || {};
            const snippet = item.snippet || {};

            if (videoMap[vId]) {
                videoMap[vId].title = snippet.title;
                videoMap[vId].channelTitle = snippet.channelTitle;
                videoMap[vId].thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;
                videoMap[vId].publishedAt = snippet.publishedAt || null;
                videoMap[vId].views = parseInt(stats.viewCount || "0", 10);
                videoMap[vId].likes = parseInt(stats.likeCount || "0", 10);
                videoMap[vId].comments = parseInt(stats.commentCount || "0", 10);

                totalViews += videoMap[vId].views;
                totalLikes += videoMap[vId].likes;
            }
        });

        const wordFrequency = {};
        tips.forEach(tip => {
            if (tip.memo && tip.memo.trim()) {
                tip.memo.split(/\s+/).forEach(rawWord => {
                    const word = rawWord.toLowerCase().replace(/[^a-z']/g, '');
                    if (word.length > 2) {
                        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
                    }
                });
            }
        });
        const wordCloud = Object.entries(wordFrequency)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const analyticalData = {
            overview: {
                channelName: channelName,
                totalTipsReceived: tips.length,
                totalSolEarned: totalSol,
                totalTimeSpentSeconds: totalTimeSpent,
                highestTipReceived: highestTip,
                totalViewsOnTippedVideos: totalViews,
                totalLikesOnTippedVideos: totalLikes,
                averageTipAmount: tips.length > 0 ? (totalSol / tips.length) : 0
            },
            videoBreakdown: Object.values(videoMap).sort((a, b) => b.totalSolEarned - a.totalSolEarned),
            wordCloud: wordCloud,
            rawTips: tips
        };

        res.json({ success: true, data: analyticalData });
    } catch (err) {
        console.error("[FlashTip] Dashboard data fetch failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

const createIndexes = async (req, res) => {
    try {
        const indexStatements = [
            "CREATE INDEX IF NOT EXISTS idx_tips_creator_address ON public.tips (creator_address);",
            "CREATE INDEX IF NOT EXISTS idx_tips_tipper_address ON public.tips (tipper_address);",
            "CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips (created_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_tips_video_link ON public.tips (video_link);"
        ];

        const results = [];
        for (const sql of indexStatements) {
            const result = await executeSql(sql);
            results.push({ sql, ok: result.ok, status: result.status });
        }

        res.json({ success: true, results });
    } catch (err) {
        console.error("[FlashTip] Create indexes failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getDashboardData, createIndexes };
