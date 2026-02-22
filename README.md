# ⚡ Flash Tip

> **Solana-powered YouTube tipping & AI creator intelligence — built for the browser.**

Flash Tip is a Chrome extension that lets viewers instantly tip their favourite YouTube creators in SOL — lightning-fast, with near-zero fees, and zero platform friction. Every tip becomes a structured data point that powers an AI-driven creator growth dashboard.

---

## 📋 Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend](#backend)
  - [Dashboard Frontend](#dashboard-frontend)
  - [Chrome Extension](#chrome-extension)
- [Environment Variables](#environment-variables)
- [Why Solana?](#why-solana)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## The Problem

YouTubers rely heavily on Google AdSense — an income stream that is inconsistent and entirely platform-controlled. Viewers who want to directly appreciate creators face their own friction:

- Super Chat is **limited to live streams**
- Platform fees **reduce creator earnings**
- The process is **not seamless or universally accessible**
- Creators gain **little structured data** from these interactions

---

## The Solution

Flash Tip removes every layer of friction between a viewer and a creator:

- ✅ **One-click SOL tips** injected directly into the YouTube interface
- ✅ **No sign-ups, no redirects** — just a button, an amount, and one Phantom approval
- ✅ **AI-powered creator dashboard** — tips become insights, insights become growth
- ✅ **Built on Solana** — micro-payments that are actually viable

> If Web3 feels complicated, users won't use it. So we made it invisible.

---

## How It Works

### For Viewers

> **Requirement:** [Phantom Wallet](https://phantom.app/) must be installed in your browser.

1. Install the **Flash Tip Chrome extension**
2. Navigate to any enrolled YouTube creator's channel or video
3. Click the **Tip with SOL** button
4. Set the tip amount in SOL
5. Approve the transaction via Phantom Wallet
6. ✅ Done — the tip is sent instantly on Solana

### For Creators

Creators must be enrolled in the Flash Tip system for the tip button to appear on their channel.

- Tips are sent **directly to your wallet** — no intermediary, minimal fees
- Access your personalised **Creator Dashboard** via the web portal to view:
  - Tip history and earnings
  - Supporter insights and behaviour patterns
  - AI-powered content and growth recommendations
  - Audience segmentation and engagement analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | JavaScript (Content Script + Popup) |
| Backend API | Node.js / Express |
| Frontend Dashboard | Next.js |
| Blockchain | Solana (Devnet / Mainnet) |
| Wallet | Phantom Wallet |
| Database | Supabase (PostgreSQL) |
| Vector Store | Qdrant |
| AI / LLM | Google Gemini + RAG pipeline |
| YouTube Data | YouTube Data API v3 |

---

## Project Structure

```
flashtip/
├── backend/               # Express API server
│   ├── src/
│   └── package.json
├── dashboard_frontend/    # Next.js creator dashboard
│   ├── app/
│   └── package.json
└── extension/             # Chrome extension
    ├── content.js
    ├── popup/
    └── manifest.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **yarn**
- A [Phantom Wallet](https://phantom.app/) browser extension
- Supabase project ([supabase.com](https://supabase.com))
- Qdrant instance ([qdrant.tech](https://qdrant.tech))
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))
- YouTube Data API v3 key ([console.cloud.google.com](https://console.cloud.google.com))

---

### Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create your environment file (see Environment Variables section below)
cp .env.example .env
# then fill in your values

# Start in development mode (with hot reload)
npm run dev

# OR start in production mode
npm run start
```

The backend server will start on `http://localhost:3001` by default.

---

### Dashboard Frontend

```bash
# Navigate to the dashboard directory
cd dashboard_frontend

# Install dependencies
npm install

# Create your environment file (see Environment Variables section below)
# Create a file named .env.local and add your values

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

### Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The Flash Tip extension icon will appear in your toolbar

> Make sure your backend is running before using the extension.

---

## Environment Variables

### Backend — `backend/.env`

```dotenv
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SOLANA_NETWORK=devnet
JWT_SECRET=flashtip-super-secret-key-123
YT_API_KEY=your_youtube_data_api_key
GEMINI_API_KEY=your_google_gemini_api_key
QDRANT_URL=your_qdrant_instance_url
QDRANT_API_KEY=your_qdrant_api_key
```

### Dashboard Frontend — `dashboard_frontend/.env.local`

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_YT_API_KEY=your_youtube_data_api_key
```

---

## Why Solana?

Traditional payment rails make micro-tipping economically unviable. Solana changes that.

| Feature | Benefit |
|---|---|
| ⚡ High throughput | Thousands of transactions per second |
| 💸 Ultra-low fees | Enables practical micro-payments |
| 🔐 Decentralised architecture | Secure and trustless |
| 🌎 Scalability | Built for consumer-scale adoption |

---

## Roadmap

- [x] Chrome extension with Phantom Wallet integration
- [x] Direct SOL tipping on YouTube
- [x] Creator enrolment system
- [x] Tip history and earnings dashboard
- [x] AI-powered content recommendations via RAG
- [x] Audience segmentation and engagement analytics
- [ ] Deeper behavioural modelling
- [ ] Predictive revenue forecasting
- [ ] Richer creator-specific metrics
- [ ] Enhanced long-term video planning
- [ ] Mobile wallet support

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

> Built with ❤️ for the Datathon — combining Web3 payments, frictionless UX, and AI-driven creator intelligence in one unified ecosystem.
