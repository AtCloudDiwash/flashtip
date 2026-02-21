const { fetchCreatorByChannelName } = require("../services/supabase");

const getCreator = async (req, res) => {
    try {
        const channelName = req.params.channelName;
        const creator = await fetchCreatorByChannelName(channelName);

        if (!creator) {
            return res.json({ found: false });
        }

        res.json({ found: true, creator });
    } catch (err) {
        console.error("[FlashTip] Creator lookup failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getCreator };
