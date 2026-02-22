const { geminiModel } = require("../config");
const { searchContext } = require("../services/qdrant");
const { saveChatMessage, fetchChatHistory } = require("../services/supabase");

const MAX_HISTORY_FOR_PROMPT = 10;

const chat = async (req, res) => {
    try {
        const { message, context } = req.body;
        const channelName = req.user.channelName;

        // Derive creatorAddress from analytics context (used for Qdrant filtering)
        const creatorAddress = context?.rawTips?.[0]?.creator_address || null;

        // 1. FETCH CONVERSATION HISTORY
        let history = [];
        try {
            history = await fetchChatHistory(channelName, MAX_HISTORY_FOR_PROMPT);
        } catch (err) {
            console.error("[FlashTip] Failed to fetch chat history:", err.message);
        }

        // 2. REPHRASE QUERY FOR RAG
        const rephrasePrompt = `You are a query rewriter. Given the user's message, decide if it is a data-related question about their creator channel (tips, earnings, watch time, audience, video performance).
            - If YES: rewrite it into a concise search query optimized for a vector database. Output ONLY the query.
            - If NO (greetings, casual chat, off-topic): output exactly the word SKIP
            
            USER MESSAGE: "${message}"`;
        
        const rephraseResult = await geminiModel.generateContent(rephrasePrompt);
        const rephrasedQuery = rephraseResult.response.text().trim();

        // 3. SEARCH VECTOR DATABASE (QDRANT)
        let ragContext = "";
        if (!/^skip$/i.test(rephrasedQuery) && creatorAddress) {
            const relevantActivities = await searchContext(creatorAddress, rephrasedQuery, 5);
            if (relevantActivities.length > 0) {
                ragContext = relevantActivities.map((a, i) => `${i + 1}. ${a}`).join('\n');
            }
        }

        // 4. BUILD CONVERSATION HISTORY STRING
        const historySection = history.length > 0
            ? history.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n')
            : "";

        // 5. FINAL LLM PROMPT WITH ALL CONTEXT
        const ragSection = ragContext 
            ? `\nRELEVANT HISTORICAL INTERACTIONS (from Vector DB):\n${ragContext}\n---` 
            : "";

        const conversationSection = historySection
            ? `\nCONVERSATION HISTORY (most recent messages):\n${historySection}\n---`
            : "";

        const finalPrompt = `You are "FlashTip AI", a helpful and concise creator strategist.

            CREATOR STATS:
            - Total SOL Earned: ${context?.overview?.totalSolEarned?.toFixed(4)} SOL
            - Total Tips: ${context?.overview?.totalTipsReceived}
            - Avg Tip Amount: ${context?.overview?.averageTipAmount?.toFixed(4)} SOL
            - Total Watch Time: ${context?.overview?.totalTimeSpentSeconds} seconds

            TOP VIDEOS:
            ${context?.videoBreakdown?.slice(0, 5).map(v => `- "${v.title}": ${v.totalSolEarned.toFixed(2)} SOL from ${v.tipsCount} tips.`).join('\n')}

            AUDIENCE SENTIMENT: ${context?.wordCloud?.map(w => w.word).join(', ')}
            ${ragSection}
            ${conversationSection}

            USER: "${message}"

            RULES:
            - You have conversation history above. Use it to maintain context and avoid repeating yourself.
            - If the user refers to something said earlier, use the conversation history to respond accurately.
            - For greetings or casual chat, reply in 1 sentence. Do NOT dump data unprompted.
            - For simple factual questions, answer in 1-2 sentences max.
            - For strategic/analytical questions, use 2-3 short paragraphs max (~120 words).
            - NEVER exceed 150 words total.
            - Be direct, data-driven, and encouraging.`;

        const finalResult = await geminiModel.generateContent(finalPrompt);
        const responseText = finalResult.response.text();

        // 6. PERSIST BOTH MESSAGES TO SUPABASE
        (async () => {
            try {
                await saveChatMessage(channelName, "user", message);
                await saveChatMessage(channelName, "ai", responseText);
            } catch (err) {
                console.error("[FlashTip] Failed to save chat messages:", err.message);
            }
        })();

        res.json({ success: true, reply: responseText });
    } catch (err) {
        console.error("[FlashTip] AI error:", err.message);
        res.status(500).json({ error: "AI failed to respond: " + err.message });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const channelName = req.user.channelName;
        const history = await fetchChatHistory(channelName, 50);

        const messages = history.map(m => ({
            role: m.role,
            content: m.content
        }));

        res.json({ success: true, messages });
    } catch (err) {
        console.error("[FlashTip] Chat history error:", err.message);
        res.json({ success: true, messages: [] });
    }
};

module.exports = { chat, getChatHistory };
