// ============================================================
// FLASHTIP — Content Script (ISOLATED world)
// Handles YouTube UI (button + modal). All Solana/Supabase
// logic is on the backend. Phantom signing is in web3-helper.js.
// ============================================================

const BACKEND_URL = "http://localhost:3001";

// ─── STATE ───────────────────────────────────────────────────
let currentChannelName = null;

// ─── YOUTUBE SPA NAVIGATION LISTENER ─────────────────────────
// YouTube is an SPA. Instead of MutationObserver which fires too early,
// we listen to YouTube's native navigation event.
document.addEventListener("yt-navigate-finish", () => {
  currentChannelName = null;
  document.getElementById("sol-tip-btn")?.remove();
  // Small delay to let React components finish mounting after the event
  setTimeout(handlePageChange, 800);
});

// Run once on initial full page load
setTimeout(handlePageChange, 800);

// ─── INJECT WEB3 HELPER INTO MAIN WORLD ──────────────────────
// Ask the background service worker to inject scripts via
// chrome.scripting.executeScript (bypasses YouTube CSP).
let web3HelperInjected = false;
function injectWeb3Helper() {
  if (web3HelperInjected) return;
  chrome.runtime.sendMessage({ type: "INJECT_WEB3_HELPER" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[FlashTip] Injection request failed:", chrome.runtime.lastError.message);
      return;
    }
    if (response?.ok) {
      web3HelperInjected = true;
      console.log("[FlashTip] web3-helper.js injected into MAIN world.");
    }
  });
}
injectWeb3Helper();

// ─── PAGE CHANGE HANDLER ──────────────────────────────────────
async function handlePageChange() {
  if (!isVideoPage()) return;

  await waitForElement("#text > a", 6000);
  await delay(600);

  const channelName = extractChannelName();
  if (!channelName || channelName === currentChannelName) return;

  currentChannelName = channelName;
  await injectOrUpdateTipButton(channelName);
}

// ─── HELPERS ─────────────────────────────────────────────────
function isVideoPage() { return location.pathname === "/watch"; }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const timer = setTimeout(() => resolve(null), timeout);
    const mo = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { clearTimeout(timer); mo.disconnect(); resolve(el); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });
}

// ─── POSTMESSAGE BRIDGE (content → MAIN world) ───────────────
function sendToMainWorld(payload) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const responseType = payload.type + "_RESPONSE";
    const pongType = "SOL_TIP_PONG";

    const handler = (event) => {
      const d = event.data;
      if (!d) return;
      const isResponse = (d.type === responseType || d.type === pongType) && d.id === id;
      if (!isResponse) return;
      window.removeEventListener("message", handler);
      if (d.error) reject(new Error(d.error));
      else resolve(d);
    };

    window.addEventListener("message", handler);
    window.postMessage({ ...payload, id }, "*");

    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Timeout waiting for web3 helper"));
    }, 30000);
  });
}

// ─── PING WITH RETRIES ───────────────────────────────────────
async function pingWithRetry(maxRetries = 5, delayMs = 800) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendToMainWorld({ type: "SOL_TIP_PING" });
    } catch (_) {
      if (i < maxRetries - 1) {
        console.log(`[FlashTip] Ping attempt ${i + 1} failed, retrying...`);
        await delay(delayMs);
      }
    }
  }
  throw new Error("Phantom wallet not detected. Install Phantom and refresh.");
}

// ─── EXTRACT CHANNEL NAME ─────────────────────────────────────
function extractChannelName() {
  try {
    const el = document.querySelector("#text > a");
    console.log(el.innerText);
    if (el) return el.innerText.trim();
  } catch (e) {
    console.error("[FlashTip] Failed to extract channel name:", e);
  }
  return null;
}

// ─── CREATOR LOOKUP (via backend) ────────────────────────────
async function fetchCreator(channelName) {
  const res = await fetch(`${BACKEND_URL}/api/creator/${encodeURIComponent(channelName)}`);
  if (!res.ok) throw new Error(`Backend error: ${res.status}`);
  const data = await res.json();
  return data.found ? data.creator : null;
}

// ─── BUTTON INJECTION ─────────────────────────────────────────
async function injectOrUpdateTipButton(channelName) {
  document.getElementById("sol-tip-btn")?.remove();

  const subscribeContainer = document.querySelector("#subscribe-button, ytd-subscribe-button-renderer");
  if (!subscribeContainer) return;

  const btn = createTipButton(false, "Checking...");
  subscribeContainer.parentNode.insertBefore(btn, subscribeContainer.nextSibling);

  let creator = null;
  try {
    creator = await fetchCreator(channelName);
  } catch (e) {
    console.error("[FlashTip] Creator lookup failed:", e);
  }

  if (creator) {
    btn.disabled = false;
    btn.title = `Tip ${creator.channel_name} with SOL`;
    btn.querySelector(".tip-btn-text").textContent = "Tip with SOL";
    btn.onclick = () => openTipModal(creator);
  } else {
    btn.disabled = true;
    btn.title = "This creator hasn't enrolled in FlashTip yet";
    btn.querySelector(".tip-btn-text").textContent = "💸 Tip with SOL";
  }
}

function createTipButton(enabled = false, label = "💸 Tip with SOL") {
  const btn = document.createElement("button");
  btn.id = "sol-tip-btn";
  btn.className = "sol-tip-button";
  btn.disabled = !enabled;
  btn.innerHTML = `<span class="tip-btn-icon">◎</span><span class="tip-btn-text">${label}</span>`;
  return btn;
}

// ─── TIP MODAL ────────────────────────────────────────────────
function openTipModal(creator) {
  document.getElementById("sol-tip-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "sol-tip-modal-overlay";
  overlay.innerHTML = `
    <div class="sol-modal">
      <div class="sol-modal-header">
        <div class="sol-modal-logo">◎</div>
        <h2 class="sol-modal-title">Tip with SOL</h2>
        <button class="sol-modal-close" id="sol-modal-close">✕</button>
      </div>

      <div class="sol-modal-creator">
        Sending to <strong>${escapeHtml(creator.channel_name)}</strong>
      </div>

      <div class="sol-modal-body">
        <div class="sol-input-group">
          <label class="sol-label">Amount (SOL)</label>
          <div class="sol-amount-row">
            <button class="sol-preset" data-amount="0.1">0.1</button>
            <button class="sol-preset" data-amount="0.5">0.5</button>
            <button class="sol-preset" data-amount="1">1</button>
            <button class="sol-preset" data-amount="5">5</button>
          </div>
          <input id="sol-amount-input" class="sol-input" type="number"
            placeholder="Custom amount" min="0.001" step="0.001" />
        </div>

        <div class="sol-input-group">
          <label class="sol-label">Message <span class="sol-optional">(optional)</span></label>
          <textarea id="sol-message-input" class="sol-input sol-textarea"
            placeholder="Leave a message for the creator..." maxlength="200"></textarea>
          <div class="sol-char-count"><span id="sol-char-counter">0</span>/200</div>
        </div>

        <div class="sol-network-badge">🟡 Solana Devnet</div>

        <button class="sol-send-btn" id="sol-send-btn">
          <span id="sol-send-label">Connect Phantom & Send</span>
        </button>

        <div class="sol-status" id="sol-status"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("sol-modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.querySelectorAll(".sol-preset").forEach((btn) => {
    btn.onclick = () => {
      overlay.querySelectorAll(".sol-preset").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("sol-amount-input").value = btn.dataset.amount;
    };
  });

  document.getElementById("sol-message-input").oninput = (e) => {
    document.getElementById("sol-char-counter").textContent = e.target.value.length;
  };

  document.getElementById("sol-send-btn").onclick = () => handleSendTip(creator);
}

// ─── SEND TIP ────────────────────────────────────────────────
// 1. Connect Phantom (via web3-helper in MAIN world)
// 2. Build transaction (via backend API)
// 3. Sign & send (via web3-helper → Phantom)
async function handleSendTip(creator) {
  const sendBtn = document.getElementById("sol-send-btn");
  const sendLabel = document.getElementById("sol-send-label");
  const statusEl = document.getElementById("sol-status");
  const amount = parseFloat(document.getElementById("sol-amount-input").value);
  const memo = document.getElementById("sol-message-input").value.trim();

  if (!amount || amount <= 0) {
    setStatus(statusEl, "error", "Please enter a valid SOL amount.");
    return;
  }

  sendBtn.disabled = true;
  sendLabel.textContent = "Checking wallet...";
  setStatus(statusEl, "info", "Detecting Phantom...");

  try {
    // Step 1: Check Phantom is available
    const ping = await pingWithRetry();
    if (!ping.hasPhantom) {
      throw new Error('Phantom not detected. <a href="https://phantom.app" target="_blank">Install it here</a>.');
    }

    // Step 2: Connect Phantom & get public key
    sendLabel.textContent = "Connecting wallet...";
    setStatus(statusEl, "info", "Please approve connection in Phantom...");

    const connectResult = await sendToMainWorld({ type: "SOL_TIP_CONNECT" });
    const fromAddress = connectResult.publicKey;

    // Step 3: Build transaction on backend
    sendLabel.textContent = "Building transaction...";
    setStatus(statusEl, "info", "Preparing transaction...");

    const buildRes = await fetch(`${BACKEND_URL}/api/build-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAddress,
        toAddress: creator.wallet_address,
        solAmount: amount,
        memo,
      }),
    });

    if (!buildRes.ok) {
      const err = await buildRes.json();
      throw new Error(err.error || "Failed to build transaction");
    }

    const { transaction: base64Tx } = await buildRes.json();

    // Step 4: Sign & send via Phantom (through web3-helper)
    sendLabel.textContent = "Awaiting Phantom approval...";
    setStatus(statusEl, "info", "Please approve in Phantom...");

    const result = await sendToMainWorld({
      type: "SOL_TIP_SIGN_AND_SEND",
      base64Tx,
    });

    // Step 5: Record tip in backend (non-blocking)
    fetch(`${BACKEND_URL}/api/record-tip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature: result.signature,
        fromAddress,
        toAddress: creator.wallet_address,
        solAmount: amount,
        memo,
        channelName: creator.channel_name,
      }),
    }).catch(() => { }); // fire-and-forget

    // Play success sound
    try {
      // Content scripts cannot use relative paths for local extension files.
      // We must use chrome.runtime.getURL so YouTube can access the extension asset.
      const audioUrl = chrome.runtime.getURL("sound/apple_pay.mp3");
      console.log(audioUrl);
      const audio = new Audio(audioUrl);

      audio.volume = 0.5;
      audio.play().catch(e => console.log("[FlashTip] Audio auto-play blocked", e));
    } catch (e) { }

    setStatus(
      statusEl, "success",
      `✅ Tip sent! <a href="https://explorer.solana.com/tx/${result.signature}?cluster=devnet" target="_blank">View on Explorer ↗</a>`
    );
    sendLabel.textContent = "Tip Sent! ◎";


  } catch (err) {
    const msg = err.message?.includes("rejected") || err.message?.includes("User rejected")
      ? "Transaction cancelled."
      : err.message || "Unknown error";
    setStatus(statusEl, "error", msg);
    sendBtn.disabled = false;
    sendLabel.textContent = "Connect Phantom & Send";
  }
}

// ─── UTILS ────────────────────────────────────────────────────
function setStatus(el, type, html) {
  el.className = `sol-status sol-status--${type}`;
  el.innerHTML = html;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}