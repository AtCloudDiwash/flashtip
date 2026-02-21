Build a fully interactive analytics dashboard called "Flash Tip" — a Solana-native creator tipping platform. Replicate the following design exactly.

Design System
Background: #0d0d14. Card surfaces: #13141f. Deeper surface: #0b0c15. Border color: rgba(255,255,255,0.07). Primary gradient: #9945ff → #14f195 (used on logo, active nav, card top borders, badges, CTA buttons, send button). All data values and wallet addresses use a monospace font. All labels use a regular sans-serif. Text: #e2e8f7. Muted: #4a5578. Green accent: #14f195. Purple accent: #9945ff. Border radius on cards: 12px.

Persistent Layout (all screens)
Left sidebar (180px wide, full height, dark surface, right border):

Flash Tip logo at top — lightning bolt icon with purple-green gradient, bold "Flash Tip" wordmark beside it
Navigation items: Overview, Videos, Audience, Transactions, AI Insights, Settings — each with an icon, muted by default, white + purple-green left border indicator when active
Bottom of sidebar: amber pulsing dot + "Solana Devnet" label in monospace

Top bar (full width, 60px tall):

Page title on the left ("Video Statistics" or "Video Collection")
Center: TPS counter with wifi icon showing live number in green, Block number in monospace, connected wallet address pill ("DYw8j...9KpRT2") with copy icon, live clock in monospace
Right: nothing (AI panel takes over)

Right AI panel (300px wide, full height, dark surface, left border):

Header: gradient avatar icon, "Flash Tip AI" title, "Your personal creator analyst" subtitle
Large scrollable chat area — AI message shown as a purple left-bordered text block, no bubble, just inline text
Bottom: suggestion chip buttons ("Which video performed best?", "Show top tippers this month", "Analyze watch time patterns", "Predict next month earnings") — dark pill buttons with muted border, glow on hover
Input bar at very bottom: dark rounded input "Ask anything..." with a gradient circular send button


Screen 1 — Video Statistics (default view)
Five stat cards in a horizontal row, equal width, dark surface, rounded corners, thin top border gradient purple-to-green:

Total SOL / 48.5
Tip Count / 127
Unique Tippers / 89
Avg Tip Amount / 0.38
Avg Watch % / 84%

Below the cards, a full-width chart card titled "Tip Timeline — When do viewers tip?". This is a vertical bar chart where the x-axis represents video timestamp from 0:00 to 30:47. Each bar represents a tip event — taller bars are larger tips. Bars alternate between purple (#9945ff) and green (#14f195), randomly distributed across the timeline. The x-axis shows timestamps at equal intervals. Dark gridlines. No y-axis labels.
Below the timeline chart, two side-by-side cards:
Left card — "Tipper Breakdown": A list of tippers. Each row shows wallet address truncated ("9KpR...Tx2D"), SOL amount in green ("4.5 SOL"), message in quotes in muted text, then three metadata tags below: watch percentage with clock icon, device with monitor icon, timezone label. Rows separated by subtle dividers.
Right card — "Message Word Cloud": Pure typographic word cloud. Words like "amazing", "helpful", "clear", "best", "tutorial", "solana", "explained", "thanks" rendered at varying sizes and alternating between #9945ff and #14f195. No background shapes, just floating words on dark surface.

Screen 2 — Video Collection
Page title: "Video Collection"
Below topbar: filter tab row — "Most Tipped" (active, gradient pill button), "Most Recent", "Most Watched" as ghost buttons. Right side has a search bar "Search videos..." with a search icon.
3-column grid of video cards. Each card: large thumbnail placeholder (light gray with image icon centered), video title in bold below, two badges side by side — green badge for SOL amount ("48.5 SOL"), purple badge for tip count ("127 tips"), then a small sparkline chart in purple below the badges showing tip activity over time. Cards have dark surface, rounded corners, subtle border, and on hover show purple-green glow border.
Videos shown: Solana Smart Contracts Deep Dive, Building on-chain programs with Anchor, NFT Minting on Solana Tutorial, DeFi Protocol Analysis: Jupiter, Solana Validator Setup Guide, Web3 Authentication with Phantom.

Screen 3 — Single Video Statistics
"← Back to Videos" breadcrumb link in muted text at the top.
Full-width hero card: thumbnail placeholder fills the card with a dark gradient overlay at the bottom. Video title "Solana Smart Contracts Deep Dive" in large bold white text overlaid at the bottom left. A short purple-to-green gradient underline beneath the title.
Below the hero: same five stat cards as Screen 1 (Total SOL, Tip Count, Unique Tippers, Avg Tip Amount, Avg Watch %) with the same styling.
Below stats: the Tip Timeline chart identical to Screen 1 — vertical bars in purple and green distributed across the video's timestamp range 0:00 to 30:47.

Interactions

Clicking a video card on Screen 2 navigates to Screen 3
"← Back to Videos" on Screen 3 returns to Screen 2
Sidebar nav items switch between screens
Filter tabs on Screen 2 reorder the video grid
Suggestion chips in the AI panel populate the input and trigger a response
All hover states glow subtly in purple or green depending on context