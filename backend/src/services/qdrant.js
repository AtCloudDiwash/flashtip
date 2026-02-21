const { qdrantClient, embeddingModel } = require("../config");
const crypto = require("crypto");

const COLLECTION_NAME = "creator_insights";

/**
 * Initializes the collection in Qdrant if it doesn't already exist.
 * Configured for Gemini text-embedding-004 (768 dimensions).
 */
const initCollection = async () => {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.find(c => c.name === COLLECTION_NAME);

        if (!exists) {
            console.log(`[Qdrant] Creating collection: ${COLLECTION_NAME}`);
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 768,
                    distance: "Cosine",
                },
            });
            // Index the creator_address for fast filtering
            await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                field_name: "creator_address",
                field_schema: "keyword",
            });
        }
    } catch (err) {
        console.error("[Qdrant] Init error:", err.message);
    }
};

/**
 * Generates an embedding for the given text using Gemini.
 */
const getEmbedding = async (text) => {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (err) {
        console.error("[Gemini] Embedding error:", err.message);
        return null;
    }
};

/**
 * Stores a tipper activity in the vector DB.
 * Each entry is appended with a unique ID.
 */
const storeActivity = async (creatorAddress, activityText, metadata = {}) => {
    try {
        await initCollection();
        const vector = await getEmbedding(activityText);
        if (!vector) return;

        await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [
                {
                    id: crypto.randomUUID(),
                    vector,
                    payload: {
                        creator_address: creatorAddress,
                        text: activityText,
                        ...metadata,
                        timestamp: new Date().toISOString(),
                    },
                },
            ],
        });
    } catch (err) {
        console.error("[Qdrant] Store activity error:", err.message);
    }
};

/**
 * Searches for relevant context for a specific creator.
 */
const searchContext = async (creatorAddress, query, limit = 5) => {
    try {
        await initCollection();
        const vector = await getEmbedding(query);
        if (!vector) return [];

        const results = await qdrantClient.search(COLLECTION_NAME, {
            vector,
            filter: {
                must: [
                    {
                        key: "creator_address",
                        match: { value: creatorAddress },
                    },
                ],
            },
            limit,
            with_payload: true,
        });

        return results.map(r => r.payload.text);
    } catch (err) {
        console.error("[Qdrant] Search context error:", err.message);
        return [];
    }
};

module.exports = {
    storeActivity,
    searchContext,
};
