// ============================================================
// TIP WITH SOL — Web3 Helper (MAIN world)
// Injected into page context so it can access window.solana
// (Phantom). Handles ALL wallet + transaction logic.
// Content script talks to this via postMessage.
// ============================================================

(function () {
  // Guard against double injection
  if (window.__solTipHelperReady) return;
  window.__solTipHelperReady = true;

  const web3 = window.solanaWeb3;
  if (!web3) {
    console.error("[TipSOL] solanaWeb3 not found — was solana-web3.min.js injected first?");
    return;
  }

  console.log("[TipSOL] Web3 helper ready. Phantom present:", !!window.solana?.isPhantom);

  // ── Listen for messages from content script ───────────────
  window.addEventListener("message", async (event) => {
    if (!event.data?.type?.startsWith("SOL_TIP_")) return;

    const { type, id } = event.data;

    // ── PING: check if Phantom is available ──────────────────
    if (type === "SOL_TIP_PING") {
      window.postMessage({
        type: "SOL_TIP_PONG",
        id,
        hasPhantom: !!(window.solana?.isPhantom),
      }, "*");
      return;
    }

    // ── SEND TIP: connect + build + sign + broadcast ─────────
    if (type === "SOL_TIP_SEND") {
      const { toAddress, solAmount, memo, network } = event.data;

      try {
        const phantom = window.solana;
        if (!phantom?.isPhantom) throw new Error("Phantom not found");

        // 1. Connect wallet
        await phantom.connect();
        const fromPubkey = phantom.publicKey;

        // 2. Setup connection
        const endpoint = network === "mainnet-beta"
          ? web3.clusterApiUrl("mainnet-beta")
          : web3.clusterApiUrl("devnet");
        const connection = new web3.Connection(endpoint, "confirmed");

        // 3. Build transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const to = new web3.PublicKey(toAddress);
        const lamports = Math.round(solAmount * web3.LAMPORTS_PER_SOL);

        const tx = new web3.Transaction({ blockhash, lastValidBlockHeight, feePayer: fromPubkey });

        // Transfer instruction
        tx.add(web3.SystemProgram.transfer({
          fromPubkey,
          toPubkey: to,
          lamports,
        }));

        // Memo instruction (on-chain message)
        if (memo) {
          const MEMO_PROGRAM_ID = new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
          tx.add(new web3.TransactionInstruction({
            keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
            programId: MEMO_PROGRAM_ID,
            data: new TextEncoder().encode(memo),
          }));
        }

        // 4. Sign & send via Phantom
        const { signature } = await phantom.signAndSendTransaction(tx);

        // 5. Confirm
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

        window.postMessage({ type: "SOL_TIP_SEND_RESPONSE", id, signature }, "*");
      } catch (err) {
        window.postMessage({ type: "SOL_TIP_SEND_RESPONSE", id, error: err.message }, "*");
      }
    }
  });
})();