const { buildTransferTransaction } = require("../services/solana");
const { recordTip } = require("../services/supabase");
const { insertActivity } = require("../services/qdrant");
const { YT_API_KEY } = require("../config");

const buildTransaction = async (req, res) => {
    try {
        const { fromAddress, toAddress, solAmount, memo } = req.body;

        // Validate inputs
        if (!fromAddress || !toAddress || !solAmount) {
            return res.status(400).json({ error: "Missing required fields: fromAddress, toAddress, solAmount" });
        }
        if (solAmount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }

        const { base64Tx, blockhash, lastValidBlockHeight } = await buildTransferTransaction({
            fromAddress,
            toAddress,
            solAmount,
            memo,
        });

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
};

const recordTipController = async (req, res) => {
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

        await recordTip({
            signature,
            tipper_address,
            creator_address,
            sol_amount: solAmount,
            video_link,
            duration_spent,
            memo: memo || null,
            channel_name,
        });

        // Background task: Enrich with YouTube data and store in Qdrant for RAG
        (async () => {
            try {
                let subCount = "unknown";
                
                // Try to get tipper/channel stats if possible
                if (channel_name && YT_API_KEY) {
                    try {
                        const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(channel_name)}&key=${YT_API_KEY}`;
                        const ytRes = await fetch(ytUrl);
                        if (ytRes.ok) {
                            const ytData = await ytRes.json();
                            if (ytData.items && ytData.items.length > 0) {
                                subCount = ytData.items[0].statistics.subscriberCount;
                            }
                        }
                    } catch (e) {
                        console.error("[YouTube Data] Failed to fetch channel stats:", e.message);
                    }
                }

                // Create an optimized interaction string for the Vector DB
                const timestamp = new Date().toLocaleString();
                const activityText = `Tipper's walllet address"${tipper_address}" (YouTube Subs: ${subCount}) tipped ${solAmount} SOL. 
                    Occurred at: ${timestamp}. 
                    Video Link: ${video_link}. 
                    Time Spent on Video: ${duration_spent} seconds. 
                    Comment: "${memo || "No message provided"}".`;

                await insertActivity(creator_address, activityText, {
                    tipper_address,
                    sol_amount: solAmount,
                    video_link,
                    duration_spent,
                    channel_name,
                    sub_count: subCount
                });
            } catch (error) {
                console.error("[FlashTip] Qdrant insertion background task failed:", error.message);
            }
        })();

        res.json({ recorded: true });
    } catch (err) {
        console.error("[FlashTip] Record tip failed:", err.message);
        // Don't fail the user — tip already went through on-chain
        res.json({ recorded: false, reason: err.message });
    }
};

module.exports = { buildTransaction, recordTip: recordTipController };
