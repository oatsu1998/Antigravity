/* ==========================================================================
   DESTINY NETWORK — Kalshi Real Sports Data Engine (via your own /api/kalshi proxy)
   NO SIMULATED DATA. Real prices only, or a visible "unavailable" state.

   Pulls three real Kalshi market types per game, all free:
     - GAME   -> moneyline
     - SPREAD -> point spread (picks the threshold closest to 50/50 as "the
                 line", the same way a sportsbook settles on one number)
     - TOTAL  -> over/under total points (same idea)
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

    // Series ticker prefixes, mirrored from api/kalshi.js, used to strip the
    // prefix off an event_ticker so we're left with just the game key
    // (e.g. "KXWNBASPREAD-26AUG16PDXPHX" -> "26AUG16PDXPHX"). Markets for the
    // same real-world game share this suffix across game/spread/total series.
    const LEAGUE_SERIES = {
        MLB:   { game: 'KXMLBGAME',   spread: 'KXMLBSPREAD',   total: 'KXMLBTOTAL' },
        NFL:   { game: 'KXNFLGAME',   spread: 'KXNFLSPREAD',   total: 'KXNFLTOTAL' },
        NBA:   { game: 'KXNBAGAME',   spread: 'KXNBASPREAD',   total: 'KXNBATOTAL' },
        NHL:   { game: 'KXNHLGAME',   spread: 'KXNHLSPREAD',   total: 'KXNHLTOTAL' },
        NCAAF: { game: 'KXNCAAFGAME', spread: 'KXNCAAFSPREAD', total: 'KXNCAAFTOTAL' },
        WNBA:  { game: 'KXWNBAGAME',  spread: 'KXWNBASPREAD',  total: 'KXWNBATOTAL' },
    };

    function gameKeyOf(market) {
        const prefixes = LEAGUE_SERIES[market._league];
        if (!prefixes) return null;
        const prefix = prefixes[market._kind];
        if (!prefix || !market.event_ticker || !market.event_ticker.startsWith(prefix + '-')) return null;
        return market._league + '::' + market.event_ticker.slice(prefix.length + 1);
    }

    // Real price only — never guesses. Prefers the live bid, falls back to
    // last traded price, returns null (no data) if neither exists yet.
    function realPriceCents(m) {
        const bid = parseFloat(m.yes_bid_dollars);
        const last = parseFloat(m.last_price_dollars);
        const raw = (!isNaN(bid) && bid > 0) ? bid : ((!isNaN(last) && last > 0) ? last : null);
        return raw === null ? null : Math.round(raw * 100);
    }

    function normalize(s) {
        return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function extractTeamName(label) {
        let clean = (label || '')
            .replace(/wins?\b/gi, '')
            .replace(/by\b/gi, '')
            .replace(/over\b/gi, '')
            .replace(/under\b/gi, '')
            .replace(/points?\b/gi, '')
            .replace(/scored\b/gi, '')
            .replace(/\d+(\.\d+)?/g, '')
            .trim();
        return normalize(clean);
    }

    const TEAM_MAP = {
        'ne': ['newengland', 'patriots', 'england', 'ne'],
        'sea': ['seattle', 'seahawks', 'sea'],
        'kc': ['kansascity', 'chiefs', 'kansas', 'kc'],
        'den': ['denver', 'broncos', 'den'],
        'lar': ['losangelesram', 'rams', 'lar', 'losangelesr'],
        'nyg': ['newyorkgiants', 'giants', 'nyg', 'newyorkg'],
        'nyj': ['newyorkjets', 'jets', 'nyj', 'newyorkj'],
        'sf': ['sanfrancisco', '49ers', 'sf'],
        'det': ['detroit', 'lions', 'det'],
        'gb': ['greenbay', 'packers', 'gb'],
        'no': ['neworleans', 'saints', 'no'],
        'atl': ['atlanta', 'falcons', 'atl'],
        'pit': ['pittsburgh', 'steelers', 'pit'],
        'tb': ['tampabay', 'buccaneers', 'bucs', 'tb'],
        'buf': ['buffalo', 'bills', 'buf'],
        'mia': ['miami', 'dolphins', 'mia'],
        'bal': ['baltimore', 'ravens', 'bal'],
        'cin': ['cincinnati', 'bengals', 'cin'],
        'cle': ['cleveland', 'browns', 'cle'],
        'hou': ['houston', 'texans', 'hou'],
        'ind': ['indianapolis', 'colts', 'ind'],
        'jax': ['jacksonville', 'jaguars', 'jax'],
        'ten': ['tennessee', 'titans', 'ten'],
        'ari': ['arizona', 'cardinals', 'ari'],
        'chi': ['chicago', 'bears', 'chi'],
        'min': ['minnesota', 'vikings', 'min'],
        'car': ['carolina', 'panthers', 'car'],
        'was': ['washington', 'commanders', 'was'],
        'phi': ['philadelphia', 'eagles', 'phi'],
        'lac': ['chargers', 'losangeleschargers', 'lac'],
        'lv': ['lasvegas', 'raiders', 'lv', 'vegas']
    };

    function teamMatches(kalshiLabel, espnName, espnAbbr) {
        const kTeam = extractTeamName(kalshiLabel);
        if (!kTeam) return false;
        const n = normalize(espnName);
        const a = normalize(espnAbbr);

        if (a && a === kTeam) return true;
        if (n && (n === kTeam || (n.length > 5 && kTeam.length > 5 && (n.includes(kTeam) || kTeam.includes(n))))) return true;

        const aliasList = TEAM_MAP[a];
        if (aliasList) {
            return aliasList.some(alias => {
                if (alias.length <= 3) {
                    return kTeam === alias;
                }
                return kTeam.includes(alias) || alias.includes(kTeam);
            });
        }
        return false;
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
    let currentPollDelay = 5000;
    const INITIAL_POLL_INTERVAL = 5000;
    const MAX_POLL_INTERVAL = 60000;

    // Calls YOUR OWN Vercel server (which then talks to Kalshi), not Kalshi directly.
    // This avoids the browser CORS block.
    const KALSHI_PROXY_URL = '/api/kalshi';

    const DestinyLiveFeed = {
        centsToAmericanOdds: centsToAmericanOdds,
        kalshiCache: {},       // ticker -> tick payload (used by momentum/UI flash effects)
        gameIndex: {},         // gameKey -> { teamA, teamB, markets: [...] } (moneyline)
        spreadIndex: {},       // gameKey -> [markets]
        totalIndex: {},        // gameKey -> [markets]
        lastError: null,

        connect: function() {
            this._loadCacheFallback();
            this._setupVisibilityListener();
            this._pollRealKalshiData();
        },

        _setupVisibilityListener: function() {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (pollTimer) clearTimeout(pollTimer);
                } else {
                    currentPollDelay = INITIAL_POLL_INTERVAL;
                    this._pollRealKalshiData();
                }
            });
        },

        _loadCacheFallback: function() {
            try {
                const rawCache = localStorage.getItem('espn_events_cache') || localStorage.getItem('kalshi_events_cache');
                if (rawCache) {
                    const markets = JSON.parse(rawCache);
                    if (Array.isArray(markets) && markets.length > 0) {
                        this._processMarkets(markets, true);
                    }
                }
            } catch (e) {
                console.warn('[DestinyLiveFeed] Cache fallback load error:', e);
            }
        },

        _scheduleNextPoll: function() {
            if (pollTimer) clearTimeout(pollTimer);
            if (!document.hidden) {
                pollTimer = setTimeout(() => this._pollRealKalshiData(), currentPollDelay);
            }
        },

        // ── Fetch real sports market data via our own server proxy ──────────
        // If this fails for ANY reason, we show an error. We never invent numbers.
        _pollRealKalshiData: function() {
            if (document.hidden) return;
            fetch(KALSHI_PROXY_URL)
                .then(res => {
                    if (!res.ok) throw new Error('Proxy returned status ' + res.status);
                    return res.json();
                })
                .then(data => {
                    if (data.error) throw new Error(data.error);

                    consecutiveFailures = 0;
                    currentPollDelay = INITIAL_POLL_INTERVAL; // Reset backoff on success
                    this.lastError = null;
                    const markets = data.markets || [];

                    if (markets.length === 0) {
                        this._setError('No open Kalshi sports markets returned');
                        this._scheduleNextPoll();
                        return;
                    }

                    // Save to cache for fallback resilience
                    try {
                        localStorage.setItem('kalshi_events_cache', JSON.stringify(markets));
                        localStorage.setItem('espn_events_cache', JSON.stringify(markets));
                    } catch (e) {}

                    this._processMarkets(markets, false);
                    this._scheduleNextPoll();
                })
                .catch(err => {
                    consecutiveFailures++;
                    currentPollDelay = Math.min(currentPollDelay * 2, MAX_POLL_INTERVAL); // Exponential backoff: 5s -> 10s -> 20s -> 40s -> 60s
                    this._setError(err.message);
                    this._loadCacheFallback();
                    this._scheduleNextPoll();
                });
        },

        _processMarkets: function(markets, isFallback = false) {
            const newGameIndex = {};
            const newSpreadIndex = {};
            const newTotalIndex = {};
            let pricedCount = 0;

            markets.forEach(m => {
                const gk = gameKeyOf(m);
                if (!gk) return;

                const yesPrice = realPriceCents(m);
                if (yesPrice === null) return; // no real liquidity yet — skip, never guess

                pricedCount++;

                if (m._kind === 'game') {
                    if (!newGameIndex[gk]) newGameIndex[gk] = [];
                    newGameIndex[gk].push({ team: m.yes_sub_title, yesPrice, ticker: m.ticker });
                } else if (m._kind === 'spread') {
                    if (!newSpreadIndex[gk]) newSpreadIndex[gk] = [];
                    newSpreadIndex[gk].push({ team: m.yes_sub_title, line: m.floor_strike, yesPrice, ticker: m.ticker });
                } else if (m._kind === 'total') {
                    if (!newTotalIndex[gk]) newTotalIndex[gk] = [];
                    newTotalIndex[gk].push({ line: m.floor_strike, yesPrice, ticker: m.ticker });
                }

                // Momentum / flash-effect tick, same as before
                const prevPayload = this.kalshiCache[m.ticker];
                const direction = prevPayload ? (yesPrice > prevPayload.yesPrice ? 'UP' : (yesPrice < prevPayload.yesPrice ? 'DOWN' : prevPayload.direction || 'FLAT')) : 'FLAT';
                const payload = {
                    ticker: m.ticker,
                    team: m.yes_sub_title || m.title,
                    matchup: m.title,
                    yesPrice: yesPrice,
                    noPrice: 100 - yesPrice,
                    americanOdds: centsToAmericanOdds(yesPrice),
                    direction: direction,
                    volume: parseFloat(m.volume_fp) || 0,
                    closeTime: m.close_time || null,
                    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
                };
                this.kalshiCache[m.ticker] = payload;
                if (!isFallback) {
                    listeners.kalshi.forEach(cb => cb(payload));
                    listeners.momentum.forEach(cb => cb(payload));
                }
            });

            this.gameIndex = newGameIndex;
            this.spreadIndex = newSpreadIndex;
            this.totalIndex = newTotalIndex;

            if (pricedCount === 0 && !isFallback) {
                this._setError('Kalshi markets are open but none have real pricing yet');
                return;
            }

            if (!isFallback) {
                this._updateBadge(true, '⚡ KALSHI SPORTS LIVE');
            } else {
                this._updateBadge(true, '⚡ KALSHI CACHED DATA');
            }
        },

        // Find the gameKey whose two Kalshi team labels match this ESPN
        // away/home pair, checking every league's game index. Returns null
        // if there's no real match — callers must never fabricate a result.
        _findGameKey: function(awayAbbr, homeAbbr, awayName, homeName) {
            const indexes = [this.gameIndex, this.spreadIndex, this.totalIndex];
            // First pass: require BOTH away and home teams to match in the game key's markets
            for (const idx of indexes) {
                for (const gk in idx) {
                    const markets = idx[gk];
                    if (!markets || markets.length === 0) continue;
                    let matchesAway = false;
                    let matchesHome = false;
                    for (const m of markets) {
                        const label = m.team || m.title || '';
                        if (teamMatches(label, awayName, awayAbbr)) matchesAway = true;
                        if (teamMatches(label, homeName, homeAbbr)) matchesHome = true;
                    }
                    if (matchesAway && matchesHome) {
                        return gk;
                    }
                }
            }
            // Second pass: fallback if ticker itself contains both abbreviations
            const eventSuffix = (normalize(awayAbbr) + normalize(homeAbbr));
            const eventSuffixRev = (normalize(homeAbbr) + normalize(awayAbbr));
            for (const idx of indexes) {
                for (const gk in idx) {
                    const normGk = normalize(gk);
                    if (normGk.includes(eventSuffix) || normGk.includes(eventSuffixRev)) {
                        return gk;
                    }
                }
            }
            return null;
        },

        // ── REAL moneyline lookup. Returns null (never fake numbers) if the
        //    game or live pricing isn't available yet. ──────────────────────
        getKalshiOdds: function(awayAbbr, homeAbbr, awayName, homeName) {
            const gk = this._findGameKey(awayAbbr, homeAbbr, awayName, homeName);
            if (!gk) return null;
            const teams = this.gameIndex[gk];
            if (!teams || teams.length < 2) return null;

            const awayEntry = teamMatches(teams[0].team, awayName, awayAbbr) ? teams[0] : teams[1];
            const homeEntry = awayEntry === teams[0] ? teams[1] : teams[0];
            if (!awayEntry || !homeEntry) return null;

            return {
                awayCents: awayEntry.yesPrice,
                homeCents: homeEntry.yesPrice,
                awayAmerican: centsToAmericanOdds(awayEntry.yesPrice),
                homeAmerican: centsToAmericanOdds(homeEntry.yesPrice),
                awayTicker: awayEntry.ticker,
                homeTicker: homeEntry.ticker
            };
        },

        // ── REAL spread + total lookup, sportsbook-style. Picks the
        //    threshold market closest to 50/50 as "the line", same as how a
        //    book sets its number. Returns null pieces where data is missing
        //    — never fabricated. ────────────────────────────────────────────
        getKalshiBookLine: function(awayAbbr, homeAbbr, awayName, homeName) {
            const gk = this._findGameKey(awayAbbr, homeAbbr, awayName, homeName);
            if (!gk) return null;

            let spread = null;
            const spreadMarkets = this.spreadIndex[gk];
            if (spreadMarkets && spreadMarkets.length) {
                const closest = spreadMarkets.reduce((best, m) =>
                    Math.abs(m.yesPrice - 50) < Math.abs(best.yesPrice - 50) ? m : best
                );
                const favIsAway = teamMatches(closest.team, awayName, awayAbbr);
                const favIsHome = !favIsAway && teamMatches(closest.team, homeName, homeAbbr);
                if (favIsAway || favIsHome) {
                    const favCents = closest.yesPrice;
                    const dogCents = 100 - closest.yesPrice;
                    spread = {
                        awayLine: favIsAway ? -closest.line : closest.line,
                        homeLine: favIsHome ? -closest.line : closest.line,
                        awayAmerican: centsToAmericanOdds(favIsAway ? favCents : dogCents),
                        homeAmerican: centsToAmericanOdds(favIsHome ? favCents : dogCents)
                    };
                }
            }

            let total = null;
            const totalMarkets = this.totalIndex[gk];
            if (totalMarkets && totalMarkets.length) {
                const closest = totalMarkets.reduce((best, m) =>
                    Math.abs(m.yesPrice - 50) < Math.abs(best.yesPrice - 50) ? m : best
                );
                total = {
                    line: closest.line,
                    overAmerican: centsToAmericanOdds(closest.yesPrice),
                    underAmerican: centsToAmericanOdds(100 - closest.yesPrice)
                };
            }

            if (!spread && !total) return null;
            return { spread, total };
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
