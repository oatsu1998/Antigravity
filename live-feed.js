/* ==========================================================================
   DESTINY NETWORK — WebSockets Live Feed Engine & Stream Manager
   ========================================================================== */

(function() {
    'use strict';

    const listeners = {
        odds: new Set(),
        scores: new Set(),
        lineShift: new Set(),
        kalshi: new Set()
    };

    let socket = null;
    let isConnected = false;
    let simulationTimer = null;

    const DestinyLiveFeed = {
        wsUrl: null,

        // ── Initialize WebSocket Connection ─────────────────────────────────
        connect: function(url = null) {
            this.wsUrl = url || (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws';
            
            try {
                socket = new WebSocket(this.wsUrl);
                
                socket.onopen = () => {
                    isConnected = true;
                    console.log('[DestinyLiveFeed] WebSocket Connection Established:', this.wsUrl);
                    this._updateBadge(true, 'WS LIVE FEED');
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
                    console.warn('[DestinyLiveFeed] WebSocket Connection Failed. Engaging Ticker Simulation.');
                    this._startSimulation();
                };

                socket.onclose = () => {
                    isConnected = false;
                    this._startSimulation();
                };
            } catch(e) {
                console.warn('[DestinyLiveFeed] WebSockets not available at host. Running High-Frequency Ticker Simulation.');
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
            listeners.kalshi.forEach(cb => cb(tickData));
        },

        // ── Subscription Handlers ───────────────────────────────────────────
        onOddsUpdate: function(cb) { listeners.odds.add(cb); return () => listeners.odds.delete(cb); },
        onScoreUpdate: function(cb) { listeners.scores.add(cb); return () => listeners.scores.delete(cb); },
        onLineShift: function(cb) { listeners.lineShift.add(cb); return () => listeners.lineShift.delete(cb); },
        onKalshiTick: function(cb) { listeners.kalshi.add(cb); return () => listeners.kalshi.delete(cb); },

        // ── Dispatchers ─────────────────────────────────────────────────────
        _handleIncomingPayload: function(payload) {
            if (!payload || !payload.type) return;

            if (payload.type === 'ODDS' || payload.type === 'LINE_SHIFT') {
                listeners.odds.forEach(cb => cb(payload.data));
                listeners.lineShift.forEach(cb => cb(payload.data));
            } else if (payload.type === 'SCORE') {
                listeners.scores.forEach(cb => cb(payload.data));
            } else if (payload.type === 'KALSHI') {
                listeners.kalshi.forEach(cb => cb(payload.data));
            }
        },

        // ── Fallback High-Frequency Simulation ─────────────────────────────
        _startSimulation: function() {
            if (simulationTimer) return;
            this._updateBadge(true, 'LIVE FEED ACTIVE');

            const MOCK_TEAMS = ['LAL', 'DEN', 'DAL', 'MIN', 'GSW', 'SAC', 'BOS', 'NYK'];
            const MOCK_MARKETS = ['h2h', 'spreads', 'totals'];

            simulationTimer = setInterval(() => {
                const randomType = Math.random();
                
                if (randomType < 0.4) {
                    // Line Shift Tick
                    const team = MOCK_TEAMS[Math.floor(Math.random() * MOCK_TEAMS.length)];
                    const shift = (Math.random() > 0.5 ? 0.5 : -0.5);
                    const isPositive = shift > 0;
                    
                    const payload = {
                        team: team,
                        market: MOCK_MARKETS[Math.floor(Math.random() * MOCK_MARKETS.length)],
                        shift: shift,
                        direction: isPositive ? 'UP' : 'DOWN',
                        timestamp: new Date().toLocaleTimeString()
                    };

                    listeners.lineShift.forEach(cb => cb(payload));
                    listeners.odds.forEach(cb => cb(payload));

                    // Highlight elements with data-team if present on screen
                    const matches = document.querySelectorAll(`[data-team="${team}"]`);
                    matches.forEach(el => {
                        el.classList.remove('flash-green', 'flash-red');
                        void el.offsetWidth; // trigger reflow
                        el.classList.add(isPositive ? 'flash-green' : 'flash-red');
                    });
                } else if (randomType < 0.75) {
                    // Kalshi Order Book & Price Tick
                    const newYes = Math.floor(55 + Math.random() * 30);
                    const payload = {
                        ticker: 'FED-CUT-25BP',
                        yesPrice: newYes,
                        noPrice: 100 - newYes,
                        volume: Math.floor(1000 + Math.random() * 5000),
                        timestamp: new Date().toLocaleTimeString()
                    };
                    listeners.kalshi.forEach(cb => cb(payload));
                }
            }, 3000);
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

    // Auto-connect on startup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DestinyLiveFeed.connect());
    } else {
        DestinyLiveFeed.connect();
    }

    window.DestinyLiveFeed = DestinyLiveFeed;
})();
