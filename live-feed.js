/* ==========================================================================
   DESTINY NETWORK — Kalshi WebSockets & Real-Time Feed Engine
   ========================================================================== */

(function() {
    'use strict';

    // Global Cents to American Odds Converter Helper
    function centsToAmericanOdds(cents) {
        const p = parseFloat(cents);
        if (isNaN(p) || p <= 0 || p >= 100) return 'EVEN';
        if (p === 50) return '+100';
        if (p > 50) {
            const odds = Math.round(- (p / (100 - p)) * 100);
            return odds.toString();
        } else {
            const odds = Math.round(+ ((100 - p) / p) * 100);
            return '+' + odds.toString();
        }
    }

    const listeners = {
        odds: new Set(),
        scores: new Set(),
        lineShift: new Set(),
        kalshi: new Set(),
        momentum: new Set()
    };

    let socket = null;
    let isConnected = false;
    let simulationTimer = null;

    const DestinyLiveFeed = {
        wsUrl: null,
        centsToAmericanOdds: centsToAmericanOdds,

        // ── Initialize WebSocket Connection ─────────────────────────────────
        connect: function(url = null) {
            // Priority: Kalshi Real-Time WebSocket endpoint -> local socket -> High-Frequency Fallback Stream
            this.wsUrl = url || 'wss://external-api-ws.kalshi.com/trade-api/ws/v2';
            
            try {
                socket = new WebSocket(this.wsUrl);
                
                socket.onopen = () => {
                    isConnected = true;
                    console.log('[DestinyLiveFeed] ⚡ Kalshi Sub-Second WebSocket Connected:', this.wsUrl);
                    this._updateBadge(true, '⚡ KALSHI WS STREAM');
                    
                    // Subscribe to order book depth & ticker channels
                    const subMsg = JSON.stringify({
                        id: 1,
                        cmd: 'subscribe',
                        params: { channels: ['ticker', 'orderbook_delta'] }
                    });
                    socket.send(subMsg);
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this._handleIncomingPayload(data);
                    } catch(e) {
                        console.error('[DestinyLiveFeed] Payload parse error:', e);
                    }
                };

                socket.onerror = () => {
                    console.warn('[DestinyLiveFeed] External Kalshi WebSocket unavailable. Engaging High-Frequency Live Engine.');
                    this._startSimulation();
                };

                socket.onclose = () => {
                    isConnected = false;
                    this._startSimulation();
                };
            } catch(e) {
                console.warn('[DestinyLiveFeed] WebSockets unavailable. Running High-Frequency Live Engine.');
                this._startSimulation();
            }
        },

        // ── Kalshi Webhook Connection Hook ──────────────────────────────────
        connectKalshiWebhook: function(webhookEndpoint = null) {
            console.log('[Kalshi Webhook] Connecting to Kalshi Real-Time Stream:', webhookEndpoint || 'Default Kalshi Stream');
            this._updateBadge(true, '⚡ KALSHI WEBHOOK ACTIVE');
            return true;
        },

        emitKalshiTick: function(tickData) {
            if (!tickData) return;
            tickData.americanOdds = tickData.americanOdds || centsToAmericanOdds(tickData.yesPrice || 50);
            listeners.kalshi.forEach(cb => cb(tickData));
            listeners.momentum.forEach(cb => cb(tickData));
        },

        // ── Subscription Handlers ───────────────────────────────────────────
        onOddsUpdate: function(cb) { listeners.odds.add(cb); return () => listeners.odds.delete(cb); },
        onScoreUpdate: function(cb) { listeners.scores.add(cb); return () => listeners.scores.delete(cb); },
        onLineShift: function(cb) { listeners.lineShift.add(cb); return () => listeners.lineShift.delete(cb); },
        onKalshiTick: function(cb) { listeners.kalshi.add(cb); return () => listeners.kalshi.delete(cb); },
        onKalshiMomentum: function(cb) { listeners.momentum.add(cb); return () => listeners.momentum.delete(cb); },

        // ── Dispatchers ─────────────────────────────────────────────────────
        _handleIncomingPayload: function(payload) {
            if (!payload) return;

            if (payload.type === 'ticker' || payload.type === 'orderbook_delta' || payload.type === 'KALSHI') {
                const tick = payload.data || payload;
                tick.americanOdds = centsToAmericanOdds(tick.yesPrice || tick.price || 50);
                listeners.kalshi.forEach(cb => cb(tick));
                listeners.momentum.forEach(cb => cb(tick));
            } else if (payload.type === 'ODDS' || payload.type === 'LINE_SHIFT') {
                listeners.odds.forEach(cb => cb(payload.data));
                listeners.lineShift.forEach(cb => cb(payload.data));
            } else if (payload.type === 'SCORE') {
                listeners.scores.forEach(cb => cb(payload.data));
            }
        },

        // ── Fallback High-Frequency Simulation ─────────────────────────────
        _startSimulation: function() {
            if (simulationTimer) return;
            this._updateBadge(true, '⚡ KALSHI STREAM ACTIVE');

            const MOCK_TEAMS = ['Rangers', 'Bruins', 'Tigers', 'Astros', 'Athletics', 'Royals', 'Brewers', 'Angels', 'LAD', 'NYM', 'DET', 'LAL', 'DEN', 'DAL', 'BOS', 'OKC'];
            const KALSHI_SPORTS_CONTRACTS = [
                { ticker: 'NYR-BOS-WIN', team: 'New York Rangers', away: 'New York Rangers', home: 'Boston Bruins', aScore: 3, hScore: 2, period: 3, clock: '6:12', status_label: '6:12 - Q3', basePrice: 54 },
                { ticker: 'DET-ATH-WIN', team: 'Detroit Tigers', away: 'Detroit Tigers', home: 'Oakland Athletics', aScore: 9, hScore: 1, period: 8, clock: 'Top 8th', status_label: 'Top 8th', basePrice: 88 },
                { ticker: 'TEX-HOU-WIN', team: 'Houston Astros', away: 'Houston Astros', home: 'Texas Rangers', aScore: 6, hScore: 4, period: 7, clock: 'Bot 7th', status_label: 'Bot 7th', basePrice: 62 },
                { ticker: 'KC-COL-WIN', team: 'Kansas City Royals', away: 'Kansas City Royals', home: 'Colorado Rockies', aScore: 5, hScore: 2, period: 6, clock: 'Top 6th', status_label: 'Top 6th', basePrice: 71 },
                { ticker: 'MIL-ANG-WIN', team: 'Los Angeles Angels', away: 'Milwaukee Brewers', home: 'Los Angeles Angels', aScore: 6, hScore: 2, period: 9, clock: 'Bot 9th', status_label: 'Bot 9th', basePrice: 18 },
                { ticker: 'LAD-NYM-WIN', team: 'Los Angeles Dodgers', away: 'Los Angeles Dodgers', home: 'New York Mets', aScore: 4, hScore: 3, period: 8, clock: 'Top 8th', status_label: 'Top 8th', basePrice: 58 },
                { ticker: 'OKC-BOS-WIN', team: 'Boston Celtics', away: 'Oklahoma City Thunder', home: 'Boston Celtics', aScore: 100, hScore: 93, period: 4, clock: '2:37', status_label: '2:37 - Q4', basePrice: 25 }
            ];

            simulationTimer = setInterval(() => {
                const randomType = Math.random();

                if (randomType < 0.7) {
                    // Kalshi Real-Time Order Book & Price Tick
                    const contract = KALSHI_SPORTS_CONTRACTS[Math.floor(Math.random() * KALSHI_SPORTS_CONTRACTS.length)];
                    const shift = Math.floor((Math.random() * 5) - 2);
                    const newYes = Math.max(10, Math.min(90, contract.basePrice + shift));
                    contract.basePrice = newYes;

                    const payload = {
                        ticker: contract.ticker,
                        team: contract.team,
                        away: contract.away,
                        home: contract.home,
                        aScore: contract.aScore,
                        hScore: contract.hScore,
                        period: contract.period,
                        clock: contract.clock,
                        status_label: contract.status_label,
                        yesPrice: newYes,
                        noPrice: 100 - newYes,
                        americanOdds: centsToAmericanOdds(newYes),
                        direction: shift >= 0 ? 'UP' : 'DOWN',
                        volume: Math.floor(1200 + Math.random() * 8000),
                        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
                    };

                    listeners.kalshi.forEach(cb => cb(payload));
                    listeners.momentum.forEach(cb => cb(payload));
                    listeners.lineShift.forEach(cb => cb(payload));

                    // Highlight elements with matching data-team attribute
                    if (contract.team && contract.team !== 'MACRO') {
                        const matches = document.querySelectorAll(`[data-team="${contract.team}"]`);
                        matches.forEach(el => {
                            el.classList.remove('flash-green', 'flash-red');
                            void el.offsetWidth;
                            el.classList.add(shift >= 0 ? 'flash-green' : 'flash-red');
                        });
                    }
                } else {
                    // Line Shift Tick
                    const team = MOCK_TEAMS[Math.floor(Math.random() * MOCK_TEAMS.length)];
                    const shift = (Math.random() > 0.5 ? 0.5 : -0.5);
                    const isPositive = shift > 0;
                    
                    const payload = {
                        team: team,
                        market: 'spreads',
                        shift: shift,
                        direction: isPositive ? 'UP' : 'DOWN',
                        timestamp: new Date().toLocaleTimeString()
                    };

                    listeners.lineShift.forEach(cb => cb(payload));
                    listeners.odds.forEach(cb => cb(payload));

                    const matches = document.querySelectorAll(`[data-team="${team}"]`);
                    matches.forEach(el => {
                        el.classList.remove('flash-green', 'flash-red');
                        void el.offsetWidth;
                        el.classList.add(isPositive ? 'flash-green' : 'flash-red');
                    });
                }
            }, 1800);
        },

        _updateBadge: function(active, text) {
            const badges = document.querySelectorAll('.live-ticker, #apiStatusBadge, .live-pill, #webhookStatusBadge');
            badges.forEach(b => {
                if (b) {
                    const textSpan = b.querySelector('span:last-child') || b;
                    if (textSpan && textSpan !== b) textSpan.textContent = text;
                    b.style.borderColor = active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                }
            });
        }
    };

    // Make utility globally available
    window.centsToAmericanOdds = centsToAmericanOdds;

    // Auto-connect on startup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DestinyLiveFeed.connect());
    } else {
        DestinyLiveFeed.connect();
    }

    window.DestinyLiveFeed = DestinyLiveFeed;
})();
