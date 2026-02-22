const { qdrantClient, embeddingModel } = require("../config");
const crypto = require("crypto");

const COLLECTION_NAME = "creator_insights";

/**
 * Ensures the collection exists with correct parameters (768 dims for gemini-embedding-001).
 * This is called automatically before any insertion.
 */
const ensureCollection = async () => {
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
            await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                field_name: "creator_address",
                field_schema: "keyword",
            });
        }
    } catch (err) {
        console.error("[Qdrant] Collection check failed:", err.message);
    }
};

/**
 * Inserts a new interaction into the Qdrant database.
 * Generates embeddings on-the-fly using Gemini.
 */
const insertActivity = async (creatorAddress, activityText, metadata = {}) => {
    try {
        await ensureCollection();
        
        const result = await embeddingModel.embedContent(activityText);
        const vector = result.embedding.values;

        // Programmatic Insertion
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
        console.log(`[Qdrant] Successfully inserted activity for: ${creatorAddress}`);
    } catch (err) {
        console.error("[Qdrant] Insertion error:", err.message);
    }
};

/**
 * Searches for relevant context for a specific creator.
 */
const searchContext = async (creatorAddress, query, limit = 5) => {
    try {
        await ensureCollection();
        
        // Generate query embedding
        const result = await embeddingModel.embedContent(query);
        const vector = result.embedding.values;

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
    insertActivity,
    searchContext
};
