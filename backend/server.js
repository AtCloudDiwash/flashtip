// ============================================================
// FLASHTIP — Backend Server
// Handles transaction building, Supabase lookups, and tip
// recording. The Chrome extension only does UI + Phantom signing.
// ============================================================

const express = require("express");
const cors = require("cors");
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

// Hard coded values for testing
const PORT = 3001;
const SUPABASE_URL = "https://srdwuyxxjqnqufrwncvy.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZHd1eXh4anFucXVmcnduY3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTU4NjUsImV4cCI6MjA4MjczMTg2NX0.h408eT-PqQJ3FM_870NwHVjeVCiWgR60HklwTlBDCco";
const SOLANA_NETWORK = "devnet";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// ─── SOLANA CONNECTION ───────────────────────────────────────
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");

// ─── EXPRESS APP ─────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", network: SOLANA_NETWORK });
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
        const YT_API_KEY = "AIzaSyC2InG1ez8F9NupDgb9aGy9DPGkHQ2Sq4A";
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
                        videoMap[vId].views = parseInt(stats.viewCount || "0", 10);
                        videoMap[vId].likes = parseInt(stats.likeCount || "0", 10);
                        videoMap[vId].comments = parseInt(stats.commentCount || "0", 10);

                        totalViews += videoMap[vId].views;
                        totalLikes += videoMap[vId].likes;
                    });
                }
            }
        }

        // 4. Format the final output
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
            videoBreakdown: Object.values(videoMap).sort((a, b) => b.totalSolEarned - a.totalSolEarned)
        };

        res.json({ success: true, data: analyticalData });
    } catch (err) {
        console.error("[FlashTip] Dashboard analytics failed:", err.message);
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
    console.log(`     POST /api/record-tip\n`);
});
