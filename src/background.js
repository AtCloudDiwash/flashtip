// ============================================================
// FLASHTIP — Background Service Worker
// Injects the Solana web3 library + web3-helper.js into the
// MAIN world via chrome.scripting.executeScript (bypasses CSP).
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log("[FlashTip] Extension installed.");
});

// ─── Handle injection requests from content script ───────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INJECT_WEB3_HELPER") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "No tab ID" });
      return true;
    }

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
        console.log("[FlashTip] Injected web3 lib + helper into tab", tabId);
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("[FlashTip] Injection failed:", err);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // keep channel open for async response
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