// ============================================================
// FLASHTIP — Web3 Helper (MAIN world)
// Runs in page context so it can access window.solana (Phantom).
// Only handles: PING, CONNECT, SIGN_AND_SEND.
// All transaction building is done on the backend.
// ============================================================

(function () {
  // Guard against double injection
  if (window.__flashTipHelperReady) return;
  window.__flashTipHelperReady = true;

  // Grab the local web3.js bundle (injected by background.js before this script)
  const web3 = window.solanaWeb3;
  if (!web3) {
    console.error("[FlashTip] solanaWeb3 not found. Was solana-web3.min.js injected first?");
    return;
  }

  // Expose Buffer polyfill from the web3 bundle globally (some internals need it)
  if (typeof Buffer === "undefined" && web3.Buffer) {
    window.Buffer = web3.Buffer;
  }

  console.log("[FlashTip] Web3 helper ready. Phantom present:", !!window.solana?.isPhantom);

  // ── Listen for messages from content script ───────────────
  window.addEventListener("message", async (event) => {
    if (!event.data?.type?.startsWith("SOL_TIP_")) return;

    const { type, id } = event.data;

    // ── PING: check if Phantom wallet exists ─────────────────
    if (type === "SOL_TIP_PING") {
      window.postMessage({
        type: "SOL_TIP_PONG",
        id,
        hasPhantom: !!(window.solana?.isPhantom),
      }, "*");
      return;
    }

    // ── CONNECT: connect Phantom, return public key ──────────
    if (type === "SOL_TIP_CONNECT") {
      try {
        const phantom = window.solana;
        if (!phantom?.isPhantom) throw new Error("Phantom not found");

        const resp = await phantom.connect();
        const publicKey = resp.publicKey.toString();

        window.postMessage({
          type: "SOL_TIP_CONNECT_RESPONSE",
          id,
          publicKey,
        }, "*");
      } catch (err) {
        window.postMessage({
          type: "SOL_TIP_CONNECT_RESPONSE",
          id,
          error: err.message,
        }, "*");
      }
      return;
    }

    // ── SIGN_AND_SEND: deserialize base64 tx → Phantom sign ──
    if (type === "SOL_TIP_SIGN_AND_SEND") {
      try {
        const phantom = window.solana;
        if (!phantom?.isPhantom) throw new Error("Phantom not found");

        // Deserialize the transaction from backend's base64
        const txBytes = Uint8Array.from(atob(event.data.base64Tx), (c) => c.charCodeAt(0));
        const transaction = web3.Transaction.from(txBytes);

        // Sign and send via Phantom
        const { signature } = await phantom.signAndSendTransaction(transaction);

        window.postMessage({
          type: "SOL_TIP_SIGN_AND_SEND_RESPONSE",
          id,
          signature,
        }, "*");
      } catch (err) {
        window.postMessage({
          type: "SOL_TIP_SIGN_AND_SEND_RESPONSE",
          id,
          error: err.message,
        }, "*");
      }
      return;
    }
  });
})();