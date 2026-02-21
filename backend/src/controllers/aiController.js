const { geminiModel } = require("../config");
const { searchContext } = require("../services/qdrant");

const chat = async (req, res) => {
    try {
        const { message, context, creatorAddress } = req.body;

        // RAG: Fetch relevant historical interactions from Qdrant
        let ragContext = "";
        if (creatorAddress) {
            const relevantActivities = await searchContext(creatorAddress, message, 5);
            if (relevantActivities.length > 0) {
                ragContext = "\nRECENT RELEVANT INTERACTIONS (from Vector DB):\n" + 
                    relevantActivities.map((a, i) => `${i+1}. ${a}`).join('\n');
            }
        }

        const prompt = `You are "FlashTip AI", a world-class data scientist and creator strategist. 
            Your goal is to help creators maximize their SOL earnings and understand their audience behavior using Solana tipping data and detailed viewer interaction history.

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
            ${ragContext}
            ---

            INSTRUCTIONS:
            1. Use the static overview AND the dynamic historical interactions (RAG context) to provide specific, data-driven answers.
            2. Be encouraging but professional.
            3. ADAPT RESPONSE LENGTH: 
               - For simple factual questions, be extremely concise (1-2 sentences).
               - For strategic advice or complex data analysis, provide a detailed breakdown (3-5 paragraphs).
            4. If the user asks for advice, suggest strategies based on their best-performing videos or specific high-value tipper behavior mentioned in the interactions.
            5. Use formatting like bolding or bullet points for readability.

            USER QUESTION:
            "${message}"`;

        const result = await geminiModel.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ success: true, reply: responseText });
    } catch (err) {
        console.error("[FlashTip] AI error:", err.message);
        res.status(500).json({ error: "AI failed to respond: " + err.message });
    }
};

module.exports = { chat };
