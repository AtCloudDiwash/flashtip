const { insertActivity } = require("../services/qdrant");

/**
 * Endpoint to insert activity into the vector database.
 * Body requirements: creatorAddress, activityText
 * Optional: metadata (object)
 */
const insertVectorData = async (req, res) => {
    try {
        const { creatorAddress, activityText, metadata } = req.body;

        if (!creatorAddress || !activityText) {
            return res.status(400).json({ 
                error: "Missing required fields: creatorAddress and activityText are required." 
            });
        }

        await insertActivity(creatorAddress, activityText, metadata || {});

        res.json({ 
            success: true, 
            message: "Activity successfully sent to vector database." 
        });
    } catch (err) {
        console.error("[Vector Controller] Insert error:", err.message);
        res.status(500).json({ error: "Failed to insert vector data: " + err.message });
    }
};

module.exports = {
    insertVectorData
};
