/* ==========================================================================
   DESTINY NETWORK — Kalshi Real Sports Data Engine (via your own /api/kalshi proxy)
   NO SIMULATED DATA. Real prices only, or a visible error.
   ========================================================================== */

(function() {
    'use strict';

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
        momentum: new Set(),
        error: new Set()
    };

    let pollTimer = null;
    let consecutiveFailures = 0;

    // Calls YOUR OWN Vercel server (which then talks to Kalshi), not Kalshi directly.
    // This avoids the browser CORS block.
    const KALSHI_PROXY_URL = '/api/kalshi';
    const POLL_INTERVAL_MS = 5000;

    const DestinyLiveFeed = {
        centsToAmericanOdds: centsToAmericanOdds,
        kalshiCache: {},
        lastError: null,

        connect: function() {
            this._pollRealKalshiData();
            pollTimer = setInterval(() => this._pollRealKalshiData(), POLL_INTERVAL_MS);
        },

        // ── Fetch real sports market data via our own server proxy ──────────
        // If this fails for ANY reason, we show an error. We never invent numbers.
        _pollRealKalshiData: function() {
            fetch(KALSHI_PROXY_URL)
                .then(res => {
                    if (!res.ok) throw new Error('Proxy returned status ' + res.status);
                    return res.json();
                })
                .then(data => {
                    if (data.error) throw new Error(data.error);

                    consecutiveFailures = 0;
                    this.lastError = null;
                    const markets = data.markets || [];

                    if (markets.length === 0) {
                        this._setError('No open Kalshi sports markets returned');
                        return;
                    }

                    this._updateBadge(true, '⚡ KALSHI SPORTS LIVE');

                    markets.forEach(m => {
                        if (m.yes_bid == null && m.last_price == null) return; // skip incomplete data, never guess
                        const yesPrice = m.yes_bid ?? m.last_price;
                        const payload = {
                            ticker: m.ticker,
                            team: m.title,
                            yesPrice: yesPrice,
                            noPrice: 100 - yesPrice,
                            americanOdds: centsToAmericanOdds(yesPrice),
                            volume: m.volume || 0,
                            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
                        };

                        this.kalshiCache[m.ticker] = payload;
                        listeners.kalshi.forEach(cb => cb(payload));
                        listeners.momentum.forEach(cb => cb(payload));

                        const matches = document.querySelectorAll(`[data-team="${m.title}"]`);
                        matches.forEach(el => {
                            el.classList.remove('flash-green', 'flash-red');
                            void el.offsetWidth;
                            el.classList.add('flash-green');
                        });
                    });
                })
                .catch(err => {
                    consecutiveFailures++;
                    this._setError(err.message);
                });
        },

        // ── Error state — NEVER fabricates numbers ───────────────────────────
        _setError: function(message) {
            this.lastError = message;
            console.error('[DestinyLiveFeed] Kalshi data unavailable:', message);
            this._updateBadge(false, `⛔ KALSHI DATA UNAVAILABLE`);
            listeners.error.forEach(cb => cb({ message, consecutiveFailures, timestamp: new Date().toLocaleTimeString() }));
        },

        // ── Subscription handlers (unchanged — same API as before) ──────────
        onOddsUpdate: function(cb) { listeners.odds.add(cb); return () => listeners.odds.delete(cb); },
        onScoreUpdate: function(cb) { listeners.scores.add(cb); return () => listeners.scores.delete(cb); },
        onLineShift: function(cb) { listeners.lineShift.add(cb); return () => listeners.lineShift.delete(cb); },
        onKalshiTick: function(cb) { listeners.kalshi.add(cb); return () => listeners.kalshi.delete(cb); },
        onKalshiMomentum: function(cb) { listeners.momentum.add(cb); return () => listeners.momentum.delete(cb); },
        onError: function(cb) { listeners.error.add(cb); return () => listeners.error.delete(cb); },

        _updateBadge: function(active, text) {
            const badges = document.querySelectorAll('.live-ticker, #apiStatusBadge, .live-pill, #webhookStatusBadge');
            badges.forEach(b => {
                if (b) {
                    const textSpan = b.querySelector('span:last-child') || b;
                    if (textSpan && textSpan !== b) textSpan.textContent = text;
                    b.style.borderColor = active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.7)';
                }
            });
        }
    };

    window.centsToAmericanOdds = centsToAmericanOdds;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DestinyLiveFeed.connect());
    } else {
        DestinyLiveFeed.connect();
    }

    window.DestinyLiveFeed = DestinyLiveFeed;
})();
