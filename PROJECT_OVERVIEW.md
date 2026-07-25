# 🚀 Destiny Network / Betslip Anti Gravity — Master Technical Project Overview

**Repository Directory:** `c:\Users\samue\OneDrive\Desktop\Betslip Anti Gravity`  
**Live Production URL:** [https://antigravity-three-nu.vercel.app/](https://antigravity-three-nu.vercel.app/)  
**Deployment Platform:** Vercel (Automated Git Push Integration)  
**Primary Remotes:**
- `origin`: [https://github.com/oatsu1998/Antigravity.git](https://github.com/oatsu1998/Antigravity.git)
- `old-origin`: [https://github.com/oatsu1998/Betslip.git](https://github.com/oatsu1998/Betslip.git)

---

## 1. 🚀 Executive Summary & Architecture

### Overview
**Destiny Network (Betslip Anti Gravity)** is a high-performance, real-time sports betting analytics terminal, prediction market trading interface, and line movement auditing suite. Built specifically for professional bettors, quantitative analysts, and sports handicappers, the platform turns raw odds movements, line shifts, and live game events into actionable betting intelligence.

The suite consists of **8 interconnected dashboard applications** that share a centralized design system, a multi-tab state synchronization engine, real-time WebSockets feeds, and direct external API integrations.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                DESTINY NETWORK GLOBAL NAV                               │
├───────────────┬───────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│ Command       │ Line          │ Line         │ Player       │ My           │ Kalshi     │
│ Center        │ Tracker       │ History      │ Props        │ Bets         │ Trading    │
│ (index.html)  │ (tracker.html)│ (history.html│ (props.html) │ (my-bets.html│ (kalshi.html│
└───────────────┴───────────────┴──────────────┴──────────────┴──────────────┴────────────┘
        │               │              │              │              │              │
        └───────────────┴──────────────┴──────┬───────┴──────────────┴──────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │     CENTRALIZED STATE & FEED     │
                              ├──────────────────────────────────┤
                              │ • state-manager.js (DestinyState)│
                              │ • live-feed.js (DestinyLiveFeed) │
                              │ • nav.js & theme.css             │
                              └──────────────────────────────────┘
```

### Core Technology Stack
1. **Frontend Architecture:** 100% Vanilla JavaScript (ES6+), HTML5, and Semantic CSS3. Zero heavy framework overhead (React/Vue/Angular omitted for maximum rendering speed and sub-millisecond execution).
2. **Design System:** Custom dark-mode glassmorphism styling (`theme.css`) using CSS custom properties (`--bg: #0a0c0f`, `--surface: #111418`, `--accent: #f59e0b`, `--cyan: #06b6d4`, `--win: #10b981`).
3. **Data Visualization Libraries:**
   * **Chart.js (v4.x):** Powers line history trajectories, dual Y-axis spread margin charts, and Monte Carlo sandbox previews.
   * **TradingView Lightweight Charts (v4.x):** Powers high-frequency candle/line charts in the Line Tracker terminal.
4. **State & Real-Time Engines:**
   * **`state-manager.js` (`DestinyState`):** Event-driven LocalStorage state manager with multi-tab `storage` event broadcast listener.
   * **`live-feed.js` (`DestinyLiveFeed`):** WebSocket stream manager with automated fallback to high-frequency simulated tickers.
5. **Fonts & Typography:** Google Fonts (`Barlow Condensed` for high-impact headers, `JetBrains Mono` & `IBM Plex Mono` for tabular odds data).

---

## 2. 📁 Core Dashboards & File Breakdown

The repository contains 8 primary dashboard HTML applications alongside core utility scripts and data assets:

### 1️⃣ `index.html` — Command Center
* **Functionality:** The main landing dashboard and executive scoreboard for the Destiny Network suite.
* **Key Features:**
  * Real-time live scoreboard ticker spanning NBA, NFL, MLB, NHL, WNBA, NCAAF, and MLS.
  * Sport category filter tabs with dynamic counter badges.
  * Live probability & sharp action indicator cards.
  * Quick Wager Modal allowing users to place bets directly from the main feed into `DestinyState`.
  * Visual live odds movement feed with flash animations (`flash-green` / `flash-red`).

### 2️⃣ `line-tracker.html` — Real-Time Line Tracker & Odds Terminal
* **Functionality:** Comprehensive multi-bookmaker odds aggregator and line movement tracking engine.
* **Key Features:**
  * Fetches real-time odds from **The Odds API** (`baseball_mlb`, `basketball_nba`, `icehockey_nhl`, etc.) across 9 major sportsbooks (FanDuel, DraftKings, BetMGM, BetOnline, PointsBet, Caeshars, Bovada).
  * Direct synchronization with **ESPN Scoreboard API** for live play-by-play scores, quarter/inning clocks, and team logos.
  * Embedded **TradingView Lightweight Charts** dual-axis visualization (Scores on left Y-axis, Odds/Spreads on right Y-axis).
  * **CLV (Closing Line Value)** calculation engine comparing live market consensus to opening lines.
  * Automated 7-day garbage collection engine for local odds storage (`saveLinesDb`).

### 3️⃣ `history.html` — Full-Game Line History Terminal
* **Functionality:** Professional sports betting analysis chart designed to expose in-game momentum shifts, cover flips, and CLV decay.
* **Key Features:**
  * **Spread Margin Delta ($\Delta$) Primary Chart:** Plots $(\text{Away Score} - \text{Home Score}) + \text{Away Spread}$ centered around $y = 0$ (**Cover Line**).
  * **Dynamic Covering Bands Shading:** Shades 15% opacity Blue above zero (Away covering) and 15% opacity Gold below zero (Home covering).
  * **Continuous Game Clock Normalization Engine (`parseClockToMinute`):** Normalizes NBA quarters (`Q1`–`Q4`) and MLB innings (`Top 1st`–`Final 9th`) into a continuous $0.0\text{m} \rightarrow 48.0\text{m}$ X-axis.
  * **Dual Y-Axes:** Left Y-Axis (`y-spread`) for Spread/Run Line Margin; Right Y-Axis (`y-total`) for Live Total Over/Under lines.
  * **ESPN Team Logo Nodes:** Renders preloaded 24px team logo badges on data point nodes instead of standard dots.
  * **Y-Max Grace & Canvas Padding (`grace: '15%'` & `padding.top: 25px`):** Prevents logo node clipping on peak margin spikes (+8 to +15 pts).
  * **Stacked Audit Breakdown (`The box` format) Tooltips:** Displays exact clock time, score differential, live spread vs. open, total line, play event, and sportsbook on hover.

### 4️⃣ `props.html` — Player Props Analyzer
* **Functionality:** Statistical player prop betting terminal and edge detector.
* **Key Features:**
  * Prop cards for NBA/MLB player markets (Points, Rebounds, Assists, 3PM, Hits, Runs).
  * EV (Expected Value) edge calculator with over/under selection buttons.
  * Search & filter controls by player name, team, or stat category.
  * One-click prop tracking into `DestinyState` with automatic mirroring into `my-bets.html`.

### 5️⃣ `my-bets.html` — Wager Audit & Ticket Terminal
* **Functionality:** Complete bet slip management hub and active ticket audit tool.
* **Key Features:**
  * Status filtering (ALL, PENDING, WON, LOST, CASHED OUT).
  * Live profit/loss calculation and ROI tracking linked to the global bankroll.
  * Action buttons to settle bets (Mark as Win/Loss) or cash out early.
  * Manual wager entry modal for custom sports bets.

### 6️⃣ `kalshi.html` — Prediction Market Terminal
* **Functionality:** Trading terminal for Kalshi binary prediction contracts across sports and macroeconomic events.
* **Key Features:**
  * **Cents to American Odds Engine (`centsToAmericanOdds`):** Converts Kalshi price probabilities ($36\text{¢} \rightarrow +178$, $48\text{¢} \rightarrow +108$) dynamically across all trading cards.
  * Featured NCAAF National Championship markets (Georgia, Ohio State, Texas, Oregon) and Macro Contracts (Fed Rate Cuts, Inflation, Debt Ceiling).
  * Interactive Trading Console with order size inputs, potential payout calculation, and instant position execution into `DestinyState`.
  * Inline SVG price trajectory graphs.
  * **`💡 HOW KALSHI PRICING & AMERICAN ODDS WORK`** interactive guide card.

### 7️⃣ `portfolio.html` — Bankroll & Risk Analytics Dashboard
* **Functionality:** Quantitative bankroll growth and risk management suite.
* **Key Features:**
  * **Kelly Criterion Calculator:** Recommends optimal bet sizing based on bankroll, estimated win probability, and odds.
  * Risk metric cards: Sharpe Ratio, Win Rate %, Profit Margin %, Max Drawdown %, Average CLV Edge.
  * Interactive Chart.js bankroll growth history trajectory.
  * Sport & Market allocation breakdown.

### 8️⃣ `sandbox.html` — Backtesting & Line Movement Simulator
* **Functionality:** Interactive simulation sandbox for backtesting line movement models and vigorish/juice impacts.
* **Key Features:**
  * Custom simulation parameters: Volatility, Sharp Money Bias, Public Bias, Vigorish %, Bookmaker Juice.
  * **Monte Carlo Simulation Engine:** Runs multi-iteration odds trajectories.
  * Real-time Chart.js visual output showing simulated line paths.

---

## 3. ⚡ Core Utility Modules & State Engine

```
                                    STATE ENGINE ARCHITECTURE
                                    
       TAB 1 (index.html)               TAB 2 (history.html)             TAB 3 (my-bets.html)
┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
│  DestinyState.addWager(...)  │ │   DestinyState.subscribe(...)│ │   DestinyState.subscribe(...)│
└──────────────┬───────────────┘ └──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │                                │
               ▼                                │                                │
┌──────────────────────────────┐                │                                │
│ LocalStorage ('bankroll' /   │                │                                │
│ 'destiny_game_wagers')       │                │                                │
└──────────────┬───────────────┘                │                                │
               │                                │                                │
               └──────► Window 'storage' Event ─┴────────────────────────────────┘
```

### 🎨 `theme.css` — Centralized Design System
Provides the unified dark-mode styling variables and keyframe animations:
* **CSS Custom Properties:** Defined on `:root` for uniform colors, borders, surface elevation, and typography.
* **Keyframe Animations:** `greenFlash` (positive line move), `redFlash` (negative line move), `pulseGlow` (live badges), `slideInRight` (toasts).
* **Custom Scrollbars & Toast UI:** Universal 6px themed scrollbars and fixed toast notifications container.

### 🧠 `state-manager.js` (`DestinyState`) — Multi-Tab State Engine
* **Storage Keys:**
  * `bankroll`: Global user balance (default `$10,000.00`).
  * `destiny_game_wagers`: Array of active and settled sports wagers.
  * `destiny_tracked_picks`: Array of tracked player props.
  * `kalshi_positions`: Array of open prediction market positions.
  * `destiny_game_history`: Saved line history snapshots.
* **Multi-Tab Syncing:** Listens to `window.addEventListener('storage', ...)` so updates in one tab (e.g. placing a wager on `index.html`) automatically update bankroll pills and wager lists across all open tabs in real-time.
* **Prop Mirroring:** Automatically mirrors tracked player props from `props.html` into `my-bets.html` wagers for unified portfolio management.

### 📡 `live-feed.js` (`DestinyLiveFeed`) — Real-Time Feed Engine
* **WebSocket Connection:** Attempts to connect to `wss://<host>/ws`.
* **High-Frequency Ticker Fallback:** If WebSockets are unavailable (e.g. on static hosting like Vercel), automatically engages a 3-second simulation timer emitting live line shift ticks and Kalshi order book updates.
* **DOM Flash Highlighter:** Automatically finds elements with `data-team="..."` and triggers `.flash-green` or `.flash-red` animations when line shifts occur.

### 🧭 `nav.js` — Global Navigation Bar Injector
* **Auto-Injection:** Automatically injects the top sticky navigation bar into every page.
* **Active State Detection:** Highlights the current page tab based on `window.location.pathname`.
* **Live Bankroll Pill:** Displays the real-time bankroll value linked to `DestinyState.getBankroll()`.

---

## 4. 📡 External Integrations & Data Feeds

### 1. The Odds API Integration
* **API Key:** `9827845ff1d9a1467dae344761f2db23`
* **Endpoints Used:**
  * `https://api.the-odds-api.com/v4/sports/{sport}/odds/?apiKey={key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
  * `https://api.the-odds-api.com/v4/sports/{sport}/scores/?apiKey={key}&daysFrom=1`
* **Sports Supported:** `baseball_mlb`, `basketball_nba`, `icehockey_nhl`, `basketball_wnba`, `basketball_ncaa_mens`, `soccer_usa_mls`.
* **Bookmakers Parsed:** FanDuel, DraftKings, BetMGM, BetOnline, Bovada, Caesars, PointsBet.

### 2. ESPN Scoreboard API Integration
* **Endpoints Used:**
  * `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates={date}&limit=50`
* **Data Parsed:** Real-time game clock, quarter/inning details, period scores, team records, team logos (from `a.espncdn.com`), and official game status (`pre`, `in`, `post`).

### 3. Kalshi Webhook & API Stream
* Hooked into `DestinyLiveFeed.connectKalshiWebhook()` for real-time binary market order book ticks.

### 4. Vercel Automated Deployment Pipeline
* Connected to GitHub remotes (`origin` and `old-origin`).
* Pushing to `main` branch automatically triggers Vercel static site building and CDN deployment at [https://antigravity-three-nu.vercel.app/](https://antigravity-three-nu.vercel.app/).

---

## 5. 🛠️ Current Build Status & Immediate Next Steps

### 🏁 Recent Major Commits
* **`ba16830`**: Applied Y-Max canvas padding (`top: 25px`, `grace: '15%'`) and global preloaded logo image cache (`preloadLogoCache`) for 0ms game toggling on `history.html`.
* **`d4212ba`**: Replaced default chart point dots with preloaded ESPN Team Logo Nodes across all MLB & NBA games.
* **`a750e6a`**: Implemented MLB Pipeline Architecture with Inning-to-Minute conversion (`parseClockToMinute`), Run Line Spread Margin ($\pm 1.5$), and MLB slate test datasets (`lad_nym`, `kc_det`, `ath_min`).
* **`495896f`**: Built Pro Betting Spread Margin Delta ($\Delta$) chart centered on Cover Line ($y=0$), continuous 48-min clock engine, dual Y-axes, and Tooltip Cover Status Tag on `history.html`.
* **`25cfc51`**: Implemented American odds conversion engine (`centsToAmericanOdds`), NCAAF Championship markets, and interactive guide card on `kalshi.html`.

### 📋 Recommended Next Optimizations
1. **Live WebSocket Server Integration:** Connect `DestinyLiveFeed` to a Node.js/Python WebSocket backend for live sportsbook odds streaming.
2. **Historical CSV / JSON Data Exporter:** Add a one-click export button on `history.html` and `line-tracker.html` to download line movement logs as CSV files.
3. **PWA / Offline Mode Setup:** Add a `manifest.json` and Service Worker for offline PWA installation on iOS/Android devices.

---

*Document compiled and maintained by Destiny Network Engineering Team.*
