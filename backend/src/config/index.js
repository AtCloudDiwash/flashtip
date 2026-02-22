require('dotenv').config();
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { QdrantClient } = require("@qdrant/js-client-rest");

const PORT = process.env.PORT || 3001;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const JWT_SECRET = process.env.JWT_SECRET;
const YT_API_KEY = process.env.YT_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// ─── SOLANA CONNECTION ───────────────────────────────────────
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");

// ─── GEMINI CLIENT ───────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// ─── QDRANT CLIENT ───────────────────────────────────────────
const qdrantClient = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
});

module.exports = {
    PORT,
    SOLANA_NETWORK,
    MEMO_PROGRAM_ID,
    JWT_SECRET,
    YT_API_KEY,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    GEMINI_API_KEY,
    QDRANT_URL,
    QDRANT_API_KEY,
    connection,
    geminiModel,
    embeddingModel,
    qdrantClient
};
