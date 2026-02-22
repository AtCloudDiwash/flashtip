const { SUPABASE_URL, SUPABASE_ANON_KEY } = require("../config");

const fetchCreatorByChannelName = async (channelName) => {
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
        throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
};

const loginUser = async (channelName, password) => {
    const url = `${SUPABASE_URL}/rest/v1/authUsers?channel_name=eq.${encodeURIComponent(
        channelName
    )}&password=eq.${encodeURIComponent(password)}&select=*&limit=1`;

    const response = await fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Auth service error: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
};

const recordTip = async (tipData) => {
    const { SOLANA_NETWORK } = require("../config");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tips`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
        },
        body: JSON.stringify({
            ...tipData,
            network: SOLANA_NETWORK,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
    }
    return true;
};

const fetchTipsForChannel = async (channelName) => {
    const tipsUrl = `${SUPABASE_URL}/rest/v1/tips?channel_name=eq.${encodeURIComponent(channelName)}&select=*`;
    const response = await fetch(tipsUrl, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch tips: ${response.status}`);
    }

    return await response.json();
};

const executeSql = async (sql) => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: sql })
    });
    return { ok: response.ok, status: response.status };
};

const ensureChatTable = async () => {
    const result = await executeSql(`
        CREATE TABLE IF NOT EXISTS public.chat_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            channel_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_chat_messages_channel 
            ON public.chat_messages (channel_name, created_at DESC);
    `);
    if (!result.ok) {
        throw new Error(`Failed to create chat_messages table: ${result.status}`);
    }
};

let chatTableReady = false;

const saveChatMessage = async (channelName, role, content) => {
    if (!chatTableReady) {
        await ensureChatTable();
        chatTableReady = true;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
        },
        body: JSON.stringify({ channel_name: channelName, role, content }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to save chat message: ${text}`);
    }
};

const fetchChatHistory = async (channelName, limit = 20) => {
    if (!chatTableReady) {
        await ensureChatTable();
        chatTableReady = true;
    }

    const url = `${SUPABASE_URL}/rest/v1/chat_messages?channel_name=eq.${encodeURIComponent(channelName)}&select=role,content,created_at&order=created_at.desc&limit=${limit}`;
    const response = await fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.status}`);
    }

    const data = await response.json();
    return data.reverse();
};

module.exports = {
    fetchCreatorByChannelName,
    loginUser,
    recordTip,
    fetchTipsForChannel,
    executeSql,
    saveChatMessage,
    fetchChatHistory
};
