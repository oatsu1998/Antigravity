# Destiny Sports Command Center — Project Overview

Destiny is a real-time sports intelligence, live odds tracking, player props command center, and market analytics platform.

## Real-Data Principle
- **No Mock Data**: Every score, line, market, candlestick chart, and weather metric is pulled from live, authoritative APIs (ESPN, Kalshi, Open-Meteo).
- **Graceful Fallbacks**: If real data is unavailable for a fixture or market, the UI displays clear N/A or Weather unavailable state cards rather than generating simulated numbers.

---

## System Architecture

### Core Pages & Views
1. **Command Center (`index.html`)**:
   - Real-time ESPN game scoreboards for NFL, MLB, NBA, WNBA, NHL, and NCAAF.
   - Live outdoor weather chips powered by Open-Meteo (temperature, wind speed, cardinal direction, WMO weather icon, and rotated cyan wind flag SVG).
   - Kalshi live prediction market odds (Spread, Moneyline, Total, Win%) and 24-hour candlestick price history charts.
   - Live Cover Margin and Combined Total Pace calculators.
   - Top sidebar containing Live Wagers (🔴 🟡 🟢 ticket health indicators), Destiny League featured matches, live game filters, and countdown clocks for off-day leagues.

2. **Player Props Command Center (`props.html`)**:
   - Real player prop markets from Kalshi (`/api/kalshi-props`).
   - NBA & WNBA: Points, Rebounds, Assists, 3-Pointers.
   - NFL: Passing Yards (`KXNFLPASSYDS`), Rushing Yards (`KXNFLRSHYDS`), Receiving Yards (`KXNFLRECYDS`), Receptions (`KXNFLREC`).
   - Dynamic 50/50 line detection, sportsbook odds comparisons, custom prop cards, and My Props tracker.

3. **Line Tracker (`line-tracker.html`)**:
   - Multi-bookmaker line movement history matrix and historical price chart loader (`fetchHistory()`).

4. **My Bets Tracking (`my-bets.html`)**:
   - Bet slip tracker with active ticket monitoring, win/loss status, and 95% cash-out controls.

5. **Kalshi Live Markets (`kalshi.html`)**:
   - Live prediction markets across sports, economics, and major event contracts.

6. **Strategy Sandbox (`sandbox.html`) & Portfolio (`portfolio.html`)**:
   - Interactive backtesting environment and full bankroll ledger tracking.

7. **About Network (`about.html`)**:
   - Public product documentation, real-data policy statement, and system navigation map.

---

## Serverless API Infrastructure (`/api/`)
- `/api/kalshi-props.js`: Fetches open player prop markets across NBA, WNBA, and NFL series tickers.
- `/api/kalshi-history.js`: Fetches 24-hour candlestick price history for individual Kalshi market tickers.
- `/api/kalshi.js`: Fetches live sports prediction markets.
- `/api/odds.js`: Integrates external sportsbook lines.

---

## Technical Stack
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with CSS variables), ES6+ JavaScript.
- **State & Feed**: `state-manager.js` (reactive state container) & `live-feed.js` (real-time market updates).
- **Navigation**: `nav.js` (universal sticky header, live clock, bankroll indicator, force refresh, and drawer menu).
- **Deployment**: Vercel Serverless Functions.
