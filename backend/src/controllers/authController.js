const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { loginUser } = require("../services/supabase");

const login = async (req, res) => {
    try {
        const { channelName, password } = req.body;
        const user = await loginUser(channelName, password);

        if (!user) {
            return res.status(401).json({ error: "Invalid channel name or password" });
        }

        const token = jwt.sign({ channelName: user.channel_name }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, token, channelName: user.channel_name });
    } catch (err) {
        console.error("[FlashTip] Login failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { login };
