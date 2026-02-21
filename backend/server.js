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
        const { signature, fromAddress, toAddress, solAmount, memo, channelName } = req.body;

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
                from_address: fromAddress,
                to_address: toAddress,
                sol_amount: solAmount,
                memo: memo || null,
                channel_name: channelName,
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
