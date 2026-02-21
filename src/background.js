// ============================================================
// TIP WITH SOL — Background Service Worker
// Injects the Solana web3 library + web3-helper.js into the
// MAIN world via chrome.scripting.executeScript (bypasses CSP).
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log("[TipSOL] Extension installed.");
});

// ─── Handle injection requests from content script ───────────
// Content script can't inject <script> tags that load CDN libs
// because YouTube's CSP blocks them. So we do it here instead.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "INJECT_WEB3_HELPER") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "No tab ID" });
      return true;
    }

    // Inject the local Solana web3 lib first, then the helper
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/lib/solana-web3.min.js"],
      world: "MAIN",
    })
      .then(() => {
        return chrome.scripting.executeScript({
          target: { tabId },
          files: ["src/web3-helper.js"],
          world: "MAIN",
        });
      })
      .then(() => {
        console.log("[TipSOL] Injected web3 lib + helper into tab", tabId);
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("[TipSOL] Injection failed:", err);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // keep sendResponse channel open for async
  }

  if (message.type === "GET_CONFIG") {
    sendResponse({
      supabaseUrl: "https://YOUR_PROJECT.supabase.co",
      supabaseKey: "YOUR_ANON_KEY",
    });
  }

  return true;
});

// ─── Also inject on full page loads as a fallback ─────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url?.includes("youtube.com/watch")
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/lib/solana-web3.min.js"],
      world: "MAIN",
    })
      .then(() => {
        return chrome.scripting.executeScript({
          target: { tabId },
          files: ["src/web3-helper.js"],
          world: "MAIN",
        });
      })
      .catch(() => { }); // silently fail if already injected
  }
});