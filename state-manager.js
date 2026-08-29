/* ==========================================================================
   DESTINY NETWORK — Cross-Page & Multi-Tab State Synchronization Engine
   ========================================================================== */

(function() {
    'use strict';

    const KEYS = {
        BANKROLL: 'bankroll',
        WAGERS: 'destiny_game_wagers',
        PROPS: 'destiny_tracked_picks',
        KALSHI_POSITIONS: 'kalshi_positions',
        GAME_HISTORY: 'destiny_game_history'
    };

    const subscribers = new Map();

    const DestinyState = {
        KEYS: KEYS,

        // ── Bankroll Management ──────────────────────────────────────────────
        getBankroll: function() {
            const saved = localStorage.getItem(KEYS.BANKROLL);
            const val = parseFloat(saved);
            return isNaN(val) ? 10000.00 : val;
        },

        setBankroll: function(amount, notify = true) {
            const val = parseFloat(amount);
            const sanitized = isNaN(val) ? 10000.00 : val;
            localStorage.setItem(KEYS.BANKROLL, sanitized.toFixed(2));
            if (notify) this._notify(KEYS.BANKROLL, sanitized);
            return sanitized;
        },

        getWagers: function() {
            try {
                let wagers = JSON.parse(localStorage.getItem(KEYS.WAGERS) || '[]');
                const vikingsWagers = [
                    {
                        id: 'ticket-991363123',
                        ticketNumber: '991363123',
                        event: 'VIKINGS at BRONCOS',
                        matchup: 'MIN @ DEN',
                        target: 'VIKINGS at BRONCOS',
                        selection: 'Total — UNDER 40.5',
                        type: 'Live',
                        side: 'Under 40.5',
                        sportsbook: 'FanDuel',
                        bookmaker: 'FanDuel',
                        stake: 120.00,
                        wager: 120.00,
                        toWin: 100.00,
                        placedOdds: '-120',
                        currentOdds: '-120',
                        status: 'PENDING',
                        acceptedDate: '8/29/26',
                        timestamp: '2026-08-29T00:00:00.000Z',
                        description: 'VIKINGS at BRONCOS - Total - UNDER 40.5',
                        history: ['-120', '-120', '-120']
                    },
                    {
                        id: 'ticket-991291159',
                        ticketNumber: '991291159',
                        event: 'VIKINGS at BRONCOS',
                        matchup: 'MIN @ DEN',
                        target: 'Teaser — MIN Vikings +9.5',
                        selection: 'MIN Vikings +9.5 (-117)',
                        type: 'Teaser',
                        side: 'MIN Vikings +9.5',
                        sportsbook: 'DraftKings',
                        bookmaker: 'DraftKings',
                        stake: 25.00,
                        wager: 25.00,
                        toWin: 22.73,
                        placedOdds: '-110',
                        currentOdds: '-110',
                        status: 'PENDING',
                        acceptedDate: '8/28/26',
                        timestamp: '2026-08-28T21:00:00.000Z',
                        description: 'Football - NFL - Minnesota Vikings vs Denver Broncos - Teaser | 127 Minnesota Vikings +9½ -117 for GAME',
                        history: ['-110', '-110', '-110']
                    },
                    {
                        id: 'ticket-991291089',
                        ticketNumber: '991291089',
                        event: 'VIKINGS at BRONCOS',
                        matchup: 'MIN @ DEN',
                        target: 'Parlay — MIN Vikings +3.5',
                        selection: 'MIN Vikings +3.5 (-117)',
                        type: 'Parlay',
                        side: 'MIN Vikings +3.5',
                        sportsbook: 'Caesars',
                        bookmaker: 'Caesars',
                        stake: 25.00,
                        wager: 25.00,
                        toWin: 63.50,
                        placedOdds: '+254',
                        currentOdds: '+254',
                        status: 'PENDING',
                        acceptedDate: '8/28/26',
                        timestamp: '2026-08-28T21:00:00.000Z',
                        description: 'Football - NFL - Minnesota Vikings vs Denver Broncos - Parlay | 127 Minnesota Vikings +3½ -117 for GAME',
                        history: ['+254', '+254', '+254']
                    }
                ];

                const validIds = vikingsWagers.map(t => t.id);
                wagers = wagers.filter(w => validIds.includes(w.id));

                vikingsWagers.forEach(vw => {
                    if (!wagers.some(w => w.id === vw.id)) {
                        wagers.push(vw);
                    }
                });

                localStorage.setItem(KEYS.WAGERS, JSON.stringify(wagers));
                return wagers;
            } catch (e) {
                console.error('[DestinyState] Error reading wagers:', e);
                return [];
            }
        },

        saveWagers: function(wagersArr, notify = true) {
            const data = Array.isArray(wagersArr) ? wagersArr : [];
            localStorage.setItem(KEYS.WAGERS, JSON.stringify(data));
            if (notify) this._notify(KEYS.WAGERS, data);
            return data;
        },

        addWager: function(wagerObj) {
            const wagers = this.getWagers();
            wagerObj.id = wagerObj.id || 'w_' + Date.now();
            wagerObj.timestamp = wagerObj.timestamp || new Date().toISOString();
            wagers.unshift(wagerObj);
            this.saveWagers(wagers);
            this.showToast(`Wager added: ${wagerObj.event || wagerObj.matchup || 'New Bet'}`, 'win');
            return wagerObj;
        },

        // ── Player Props ─────────────────────────────────────────────────────
        getProps: function() {
            try {
                return JSON.parse(localStorage.getItem(KEYS.PROPS) || '[]');
            } catch (e) {
                console.error('[DestinyState] Error reading props:', e);
                return [];
            }
        },

        saveProps: function(propsArr, notify = true) {
            const data = Array.isArray(propsArr) ? propsArr : [];
            localStorage.setItem(KEYS.PROPS, JSON.stringify(data));
            if (notify) this._notify(KEYS.PROPS, data);
            return data;
        },

        addProp: function(propObj) {
            const props = this.getProps();
            propObj.id = propObj.id || 'p_' + Date.now();
            propObj.status = propObj.status || 'PENDING';
            props.unshift(propObj);
            this.saveProps(props);

            // Automatically mirror into Wagers as well for cross-page portfolio tracking
            const wagerMirror = {
                id: 'prop_wager_' + propObj.id,
                event: `${propObj.player} — ${propObj.stat} ${propObj.type} ${propObj.line}`,
                matchup: propObj.matchup || 'Player Prop',
                stake: propObj.stake || 50,
                odds: propObj.odds || '-110',
                status: propObj.status === 'WON' ? 'WON' : propObj.status === 'LOST' ? 'LOST' : 'PENDING',
                type: 'Player Prop',
                bookmaker: propObj.bookmaker || 'FanDuel',
                clv: '+4.2%'
            };
            const wagers = this.getWagers();
            const existingIdx = wagers.findIndex(w => w.id === wagerMirror.id);
            if (existingIdx >= 0) {
                wagers[existingIdx] = wagerMirror;
            } else {
                wagers.unshift(wagerMirror);
            }
            this.saveWagers(wagers);

            this.showToast(`Tracked Prop: ${propObj.player} ${propObj.type} ${propObj.line}`, 'cyan');
            return propObj;
        },

        // ── Kalshi Positions ─────────────────────────────────────────────────
        getKalshiPositions: function() {
            try {
                return JSON.parse(localStorage.getItem(KEYS.KALSHI_POSITIONS) || '[]');
            } catch (e) {
                return [];
            }
        },

        saveKalshiPositions: function(positionsArr, notify = true) {
            const data = Array.isArray(positionsArr) ? positionsArr : [];
            localStorage.setItem(KEYS.KALSHI_POSITIONS, JSON.stringify(data));
            if (notify) this._notify(KEYS.KALSHI_POSITIONS, data);
            return data;
        },

        // ── Game History Snapshots ───────────────────────────────────────────
        getGameHistory: function() {
            try {
                return JSON.parse(localStorage.getItem(KEYS.GAME_HISTORY) || '{}');
            } catch (e) {
                return {};
            }
        },

        saveGameHistory: function(historyObj, notify = true) {
            const data = historyObj && typeof historyObj === 'object' ? historyObj : {};
            localStorage.setItem(KEYS.GAME_HISTORY, JSON.stringify(data));
            if (notify) this._notify(KEYS.GAME_HISTORY, data);
            return data;
        },

        // ── Event Subscription API ───────────────────────────────────────────
        subscribe: function(key, callback) {
            if (!subscribers.has(key)) {
                subscribers.set(key, new Set());
            }
            subscribers.get(key).add(callback);
            return function unsubscribe() {
                if (subscribers.has(key)) {
                    subscribers.get(key).delete(callback);
                }
            };
        },

        _notify: function(key, data) {
            if (subscribers.has(key)) {
                subscribers.get(key).forEach(cb => {
                    try { cb(data); } catch (e) { console.error(e); }
                });
            }
            // Also notify wildcard subscribers
            if (subscribers.has('*')) {
                subscribers.get('*').forEach(cb => {
                    try { cb(key, data); } catch (e) { console.error(e); }
                });
            }
        },

        // ── Toast UI Helper ─────────────────────────────────────────────────
        showToast: function(msg, type = 'accent') {
            let container = document.getElementById('destiny-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'destiny-toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `destiny-toast ${type}`;
            toast.innerHTML = `<span style="font-weight:bold;">[DESTINY]</span> <span>${msg}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    // ── Listen to Window Storage Event for Multi-Tab Syncing ───────────────
    window.addEventListener('storage', function(e) {
        if (!e.key) return;
        let parsed = e.newValue;
        try { parsed = JSON.parse(e.newValue); } catch(err) {}
        
        DestinyState._notify(e.key, parsed);
        
        // Auto-update any top nav bankroll display
        if (e.key === KEYS.BANKROLL) {
            document.querySelectorAll('.bankroll-amount, #bankrollVal').forEach(el => {
                el.textContent = '$' + parseFloat(parsed || 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            });
        }
    });

    window.DestinyState = DestinyState;
})();
