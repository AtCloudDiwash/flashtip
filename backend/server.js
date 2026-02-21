// ============================================================
// FLASHTIP — Backend Server
// Handles transaction building, Supabase lookups, and tip
// recording. The Chrome extension only does UI + Phantom signing.
// ============================================================

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    TransactionInstruction,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

// ─── CONFIG ──────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const JWT_SECRET = process.env.JWT_SECRET;
const YT_API_KEY = process.env.YT_API_KEY;

// ─── SOLANA CONNECTION ───────────────────────────────────────
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");

// ─── EXPRESS APP ─────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(" ")[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", network: SOLANA_NETWORK });
});

// ─── LOGIN ───────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
    try {
        const { channelName, password } = req.body;

        // Query the authUsers table in Supabase
        const url = `${SUPABASE_URL}/rest/v1/authUsers?channel_name=eq.${encodeURIComponent(
            channelName
        )}&password=eq.${encodeURIComponent(password)}&select=*&limit=1`;

        const response = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "Auth service error" });
        }

        const data = await response.json();
        if (data.length === 0) {
            return res.status(401).json({ error: "Invalid channel name or password" });
        }

        const user = data[0];
        const token = jwt.sign({ channelName: user.channel_name }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, token, channelName: user.channel_name });
    } catch (err) {
        console.error("[FlashTip] Login failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET CREATOR ─────────────────────────────────────────────
// Looks up a YouTube channel in Supabase to check if they're enrolled.
app.get("/api/creator/:channelName", async (req, res) => {
    try {
        const channelName = req.params.channelName;
        const url = `${SUPABASE_URL}/rest/v1/tipped_creators?channel_name=eq.${encodeURIComponent(
            channelName
        )}&select=*&limit=1`;

        const response = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "Supabase error" });
        }

        const data = await response.json();
        if (data.length === 0) {
            return res.json({ found: false });
        }

        res.json({ found: true, creator: data[0] });
    } catch (err) {
        console.error("[FlashTip] Creator lookup failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── BUILD TRANSACTION ───────────────────────────────────────
// Builds a SOL transfer transaction (+ optional memo) and
// returns it serialized as base64 so the extension can pass
// it to Phantom for signing.
app.post("/api/build-transaction", async (req, res) => {
    try {
        const { fromAddress, toAddress, solAmount, memo } = req.body;

        // Validate inputs
        if (!fromAddress || !toAddress || !solAmount) {
            return res.status(400).json({ error: "Missing required fields: fromAddress, toAddress, solAmount" });
        }
        if (solAmount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }

        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(toAddress);
        const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

        // Fetch latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        // Build transaction
        const tx = new Transaction({
            blockhash,
            lastValidBlockHeight,
            feePayer: fromPubkey,
        });

        // SOL transfer instruction
        tx.add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports,
            })
        );

        // Memo instruction (optional on-chain message)
        if (memo && memo.trim()) {
            tx.add(
                new TransactionInstruction({
                    keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
                    programId: MEMO_PROGRAM_ID,
                    data: Buffer.from(memo.trim(), "utf-8"),
                })
            );
        }

        // Serialize (without signatures — Phantom will sign)
        const serialized = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        const base64Tx = serialized.toString("base64");

        console.log(`[FlashTip] Built tx: ${solAmount} SOL from ${fromAddress.slice(0, 8)}... to ${toAddress.slice(0, 8)}...`);

        res.json({
            transaction: base64Tx,
            blockhash,
            lastValidBlockHeight,
        });
    } catch (err) {
        console.error("[FlashTip] Build transaction failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── RECORD TIP ──────────────────────────────────────────────
// Records a successful tip in Supabase for the creator dashboard.
app.post("/api/record-tip", async (req, res) => {
    try {
        const {
            signature,
            tipper_address,
            creator_address,
            solAmount,
            memo,
            channel_name,
            video_link,
            duration_spent
        } = req.body;

        const response = await fetch(`${SUPABASE_URL}/rest/v1/tips`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                signature,
                tipper_address,
                creator_address,
                sol_amount: solAmount,
                video_link,
                duration_spent,
                memo: memo || null,
                channel_name,
                network: SOLANA_NETWORK,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("[FlashTip] Supabase insert failed:", text);
            // Don't fail the user — tip already went through on-chain
            return res.json({ recorded: false, reason: text });
        }

        res.json({ recorded: true });
    } catch (err) {
        console.error("[FlashTip] Record tip failed:", err.message);
        // Don't fail the user — tip already went through on-chain
        res.json({ recorded: false, reason: err.message });
    }
});

// ─── DASHBOARD ANALYTICS (AUTHENTICATED) ─────────────────────
// Fetches tipped video data from Supabase and augments it with YouTube Analytics for the frontend dashboard
app.post("/api/dashboard/data", authenticateJWT, async (req, res) => {
    try {
        const channelName = req.user.channelName;
        if (!channelName) {
            return res.status(401).json({ error: "Missing channel name in token" });
        }

        // 1. Fetch all tips for the channel from Supabase
        const tipsUrl = `${SUPABASE_URL}/rest/v1/tips?channel_name=eq.${encodeURIComponent(channelName)}&select=*`;
        const supabaseRes = await fetch(tipsUrl, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!supabaseRes.ok) {
            return res.status(supabaseRes.status).json({ error: "Failed to fetch tips from Supabase" });
        }

        const tips = await supabaseRes.json();

        // 2. Extract unique video IDs from video_links
        const extractVideoId = (url) => {
            if (!url) return null;
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };

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

        // 3. Fetch YouTube Stats for these videos
        const videoIds = Object.keys(videoMap);

        let totalViews = 0;
        let totalLikes = 0;

        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const batches = chunkArray(videoIds, 50);

        for (const batch of batches) {
            const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}&key=${YT_API_KEY}`;
            const ytRes = await fetch(ytUrl);
            if (ytRes.ok) {
                const ytData = await ytRes.json();
                if (ytData.items) {
                    ytData.items.forEach(item => {
                        const vId = item.id;
                        const stats = item.statistics || {};
                        const snippet = item.snippet || {};

                        // Merge YT data into our videoMap
                        videoMap[vId].title = snippet.title;
                        videoMap[vId].channelTitle = snippet.channelTitle;
                        videoMap[vId].thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;
                        videoMap[vId].publishedAt = snippet.publishedAt || null;
                        videoMap[vId].views = parseInt(stats.viewCount || "0", 10);
                        videoMap[vId].likes = parseInt(stats.likeCount || "0", 10);
                        videoMap[vId].comments = parseInt(stats.commentCount || "0", 10);

                        totalViews += videoMap[vId].views;
                        totalLikes += videoMap[vId].likes;
                    });
                }
            }
        }

        // 4. Build word cloud from memos
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

        // 5. Format the final output
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
});

// ─── AI ANALYST ──────────────────────────────────────────────
// A chat endpoint that passes user's analytics context to Gemini for insights.
app.post("/api/ai/chat", authenticateJWT, async (req, res) => {
    try {
        const { message, context } = req.body;
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are "FlashTip AI", a world-class data scientist and creator strategist. 
            Your goal is to help creators maximize their SOL earnings and understand their audience behavior using Solana tipping data.

            DATA CONTEXT FOR THE CURRENT CREATOR:
            ---
            OVERVIEW STATS:
            - Total SOL Earned: ${context?.overview?.totalSolEarned?.toFixed(4)} SOL
            - Total Tips: ${context?.overview?.totalTipsReceived}
            - Highest Single Tip: ${context?.overview?.highestTipReceived} SOL
            - Avg Tip Amount: ${context?.overview?.averageTipAmount?.toFixed(4)} SOL
            - Total Watch Time from Tippers: ${context?.overview?.totalTimeSpentSeconds} seconds

            VIDEO PERFORMANCE (Top 5):
            ${context?.videoBreakdown?.slice(0, 5).map(v => `- "${v.title}": ${v.totalSolEarned.toFixed(2)} SOL from ${v.tipsCount} tips.`).join('\n')}

            AUDIENCE SENTIMENT (Word Cloud):
            ${context?.wordCloud?.map(w => w.word).join(', ')}
            ---

            INSTRUCTIONS:
            1. Use the data above to provide specific, data-driven answers.
            2. Be encouraging but professional.
            3. If the user asks for advice, suggest strategies based on their best-performing videos or tipper comments.
            4. Keep responses concise but insightful (max 3-4 paragraphs).
            5. Use formatting like bolding or bullet points for readability.

            USER QUESTION:
            "${message}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ success: true, reply: responseText });
    } catch (err) {
        console.error("[FlashTip] AI error:", err.message);
        res.status(500).json({ error: "AI failed to respond: " + err.message });
    }
});

// ─── DASHBOARD ANALYTICS ─────────────────────────────────────
// Fetches tipped video data from Supabase and augments it with YouTube Analytics
app.get("/dashboard/analytics/:channelName", async (req, res) => {
    try {
        const channelName = req.params.channelName;
        // 1. Fetch all tips for the channel from Supabase
        const tipsUrl = `${SUPABASE_URL}/rest/v1/tips?channel_name=eq.${encodeURIComponent(channelName)}&select=*`;
        const supabaseRes = await fetch(tipsUrl, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!supabaseRes.ok) {
            return res.status(supabaseRes.status).json({ error: "Failed to fetch tips from Supabase" });
        }

        const tips = await supabaseRes.json();

        if (!tips || tips.length === 0) {
            return res.json({ message: "No data found for this creator.", data: null });
        }

        // 2. Extract unique video IDs from video_links
        const extractVideoId = (url) => {
            if (!url) return null;
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };

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

        // 3. Fetch YouTube Stats for these videos
        const videoIds = Object.keys(videoMap);

        let totalViews = 0;
        let totalLikes = 0;

        // Note: YouTube API allows a max of 50 ids per request.
        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const batches = chunkArray(videoIds, 50);

        for (const batch of batches) {
            const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}&key=${YT_API_KEY}`;
            const ytRes = await fetch(ytUrl);
            if (ytRes.ok) {
                const ytData = await ytRes.json();
                if (ytData.items) {
                    ytData.items.forEach(item => {
                        const vId = item.id;
                        const stats = item.statistics || {};
                        const snippet = item.snippet || {};

                        // Merge YT data into our videoMap
                        videoMap[vId].title = snippet.title;
                        videoMap[vId].channelTitle = snippet.channelTitle;
                        videoMap[vId].thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;
                        videoMap[vId].publishedAt = snippet.publishedAt || null;
                        videoMap[vId].views = parseInt(stats.viewCount || "0", 10);
                        videoMap[vId].likes = parseInt(stats.likeCount || "0", 10);
                        videoMap[vId].comments = parseInt(stats.commentCount || "0", 10);

                        totalViews += videoMap[vId].views;
                        totalLikes += videoMap[vId].likes;
                    });
                }
            }
        }

        // 4. Build word cloud from memos
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

        // 5. Format the final output
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
            wordCloud: wordCloud
        };

        res.json({ success: true, data: analyticalData });
    } catch (err) {
        console.error("[FlashTip] Dashboard analytics failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── CREATE INDEXES ──────────────────────────────────────────
// Creates performance indexes on the tips table in Supabase.
app.post("/api/dashboard/create-indexes", authenticateJWT, async (req, res) => {
    try {
        const indexStatements = [
            "CREATE INDEX IF NOT EXISTS idx_tips_creator_address ON public.tips (creator_address);",
            "CREATE INDEX IF NOT EXISTS idx_tips_tipper_address ON public.tips (tipper_address);",
            "CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips (created_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_tips_video_link ON public.tips (video_link);"
        ];

        const results = [];
        for (const sql of indexStatements) {
            const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: "POST",
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ query: sql })
            });
            results.push({ sql, ok: rpcRes.ok, status: rpcRes.status });
        }

        res.json({ success: true, results });
    } catch (err) {
        console.error("[FlashTip] Create indexes failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 FlashTip backend running on http://localhost:${PORT}`);
    console.log(`   Network: ${SOLANA_NETWORK}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /api/health`);
    console.log(`     GET  /api/creator/:channelName`);
    console.log(`     POST /api/build-transaction`);
    console.log(`     POST /api/record-tip`);
    console.log(`     POST /api/dashboard/data`);
    console.log(`     POST /api/dashboard/create-indexes\n`);
});
