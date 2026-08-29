function loadGlobalResources() {
    // Inject Theme CSS if not present
    if (!document.querySelector('link[href*="theme.css"]')) {
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = 'theme.css';
        document.head.appendChild(themeLink);
    }

    // Inject State Manager JS if not present
    if (!window.DestinyState && !document.querySelector('script[src*="state-manager.js"]')) {
        const stateScript = document.createElement('script');
        stateScript.src = 'state-manager.js';
        document.head.appendChild(stateScript);
    }

    // Inject Live Feed JS if not present
    if (!window.DestinyLiveFeed && !document.querySelector('script[src*="live-feed.js"]')) {
        const feedScript = document.createElement('script');
        feedScript.src = 'live-feed.js';
        document.head.appendChild(feedScript);
    }
}

function initGlobalNav() {
    loadGlobalResources();

    // Inject CSS for Nav
    const style = document.createElement('style');
    style.textContent = `
        .global-nav {
            background: #0a0c0f;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 8px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 62px;
            position: sticky;
            top: 0;
            z-index: 1000;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
        }
        .global-nav-brand {
            color: #f59e0b;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 13px;
            line-height: 1.1;
        }
        .global-nav-clock {
            font-size: 10px;
            color: #06b6d4;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-top: 2px;
            font-family: 'JetBrains Mono', monospace;
            line-height: 1.1;
        }
        .nav-refresh-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #a1a1aa;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            letter-spacing: 0.5px;
            margin-top: 4px;
            width: fit-content;
            transition: all 0.2s;
        }
        .nav-refresh-btn:hover {
            background: rgba(245, 158, 11, 0.15);
            border-color: #f59e0b;
            color: #f59e0b;
            box-shadow: 0 0 6px rgba(245, 158, 11, 0.25);
        }
        .universal-menu-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 800;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .universal-menu-btn:hover {
            background: rgba(245, 158, 11, 0.18);
            border-color: #f59e0b;
            color: #f59e0b;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
        }
        .universal-menu-dropdown {
            position: absolute;
            top: 58px;
            right: 0;
            left: auto;
            background: #11151c;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.85);
            padding: 8px 0;
            min-width: 240px;
            display: none;
            z-index: 99999;
        }
        .universal-menu-dropdown.open {
            display: block;
        }
        .universal-menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 18px;
            color: #e4e4e7;
            text-decoration: none;
            font-size: 12px;
            font-weight: 700;
            transition: background 0.15s, color 0.15s;
        }
        .universal-menu-item:hover {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
        }
        .global-nav-links {
            display: flex;
            gap: 18px;
            align-items: center;
        }
        .global-nav-link {
            color: #a1a1aa;
            text-decoration: none;
            text-transform: uppercase;
            transition: color 0.2s;
            position: relative;
        }
        .global-nav-link:hover, .global-nav-link.active {
            color: #fff;
        }
        .global-nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -16px;
            left: 0;
            right: 0;
            height: 2px;
            background: #f59e0b;
        }
        .nav-bankroll-pill {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: bold;
            color: #f59e0b;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .nav-bankroll-val {
            color: #fff;
        }
    `;
    document.head.appendChild(style);

    // Determine current page for active state
    const currentPath = window.location.pathname;
    const isLineTracker = currentPath.toLowerCase().includes('line-tracker');
    const isProps = currentPath.toLowerCase().includes('props');
    const isMyBets = currentPath.toLowerCase().includes('my-bets');
    const isBetSlip = currentPath.toLowerCase().includes('bet-slip') || currentPath.toLowerCase().includes('betslip');
    const isBetHistory = currentPath.toLowerCase().includes('bet-history') || currentPath.toLowerCase().includes('bethistory');
    const isHistory = currentPath.toLowerCase().includes('history') && !isBetHistory;
    const isKalshi = currentPath.toLowerCase().includes('kalshi');
    const isSandbox = currentPath.toLowerCase().includes('sandbox');
    const isPortfolio = currentPath.toLowerCase().includes('portfolio');
    const isLayout = currentPath.toLowerCase().includes('layout');

    // Get current bankroll from localStorage or default $1,000,000.00
    const savedBankroll = parseFloat(localStorage.getItem('destiny_bankroll') || localStorage.getItem('bankroll')) || 1000000.00;
    const formattedBankroll = '$' + savedBankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Inject HTML
    const nav = document.createElement('nav');
    nav.className = 'global-nav';
    nav.innerHTML = `
        <!-- Left: Brand + Date/Time + Force Refresh Button directly under -->
        <div style="display:flex; align-items:center;">
            <div style="display:flex; flex-direction:column; justify-content:center; margin-right:28px;">
                <div class="global-nav-brand">DESTINY NETWORK</div>
                <div id="global-nav-clock" class="global-nav-clock">Loading date...</div>
                <button class="nav-refresh-btn" onclick="handleNavRefresh()" title="Force Refresh Live Data">
                    ↻ FORCE REFRESH
                </button>
            </div>

            <!-- Center: Desktop Horizontal Links -->
            <div class="global-nav-links">
                <a href="index.html" class="global-nav-link ${(!isLineTracker && !isProps && !isMyBets && !isHistory && !isBetSlip && !isBetHistory && !isKalshi && !isSandbox && !isPortfolio && !isLayout) ? 'active' : ''}">Home</a>
                <a href="my-bets.html" class="global-nav-link ${isMyBets ? 'active' : ''}">Live Bets</a>
                <a href="line-tracker.html" class="global-nav-link ${isLineTracker ? 'active' : ''}">Line Tracker</a>
                <a href="props.html" class="global-nav-link ${isProps ? 'active' : ''}">Props</a>
                <a href="history.html" class="global-nav-link ${isHistory ? 'active' : ''}">History</a>
                <a href="bet-history.html" class="global-nav-link ${isBetHistory ? 'active' : ''}">Bet History</a>
                <a href="bet-slip.html" class="global-nav-link ${isBetSlip ? 'active' : ''}">Bet Slip</a>
                <a href="kalshi.html" class="global-nav-link ${isKalshi ? 'active' : ''}">Kalshi</a>
                <a href="sandbox.html" class="global-nav-link ${isSandbox ? 'active' : ''}">Sandbox</a>
                <a href="portfolio.html" class="global-nav-link ${isPortfolio ? 'active' : ''}">Portfolio</a>
                <a href="layout.html" class="global-nav-link ${isLayout ? 'active' : ''}">Layout</a>
            </div>
        </div>

        <!-- Right: Bankroll Pill + Far Right Universal Menu Button -->
        <div style="display:flex; align-items:center; gap:14px; position:relative;">
            <div class="nav-bankroll-pill">
                <span>BANKROLL:</span>
                <span class="nav-bankroll-val bankroll-amount">${formattedBankroll}</span>
            </div>

            <!-- Universal Menu Button on Far Right -->
            <button class="universal-menu-btn" onclick="toggleUniversalMenu(event)" title="Open Universal Navigation Menu">
                <span style="font-size:14px;">☰</span> MENU
            </button>

            <!-- Universal Dropdown Drawer (Right Aligned) -->
            <div id="universal-menu-dropdown" class="universal-menu-dropdown" onclick="event.stopPropagation()">
                <div style="padding:6px 16px 8px; font-size:10px; color:#f59e0b; font-weight:800; border-bottom:1px solid rgba(255,255,255,0.08); letter-spacing:1px;">UNIVERSAL NAVIGATION</div>
                <a href="index.html" class="universal-menu-item">🏠 Home</a>
                <a href="my-bets.html" class="universal-menu-item">🎟️ Live Bets Tracking</a>
                <a href="line-tracker.html" class="universal-menu-item">📈 Line Tracker</a>
                <a href="props.html" class="universal-menu-item">🎯 Player Props</a>
                <a href="history.html" class="universal-menu-item">📜 Line History & Logs</a>
                <a href="bet-history.html" class="universal-menu-item">📑 Bet History Ledger</a>
                <a href="bet-slip.html" class="universal-menu-item">🧾 Bet Slip Builder</a>
                <a href="kalshi.html" class="universal-menu-item">📊 Kalshi Live Markets</a>
                <a href="sandbox.html" class="universal-menu-item">🧪 Strategy Sandbox</a>
                <a href="portfolio.html" class="universal-menu-item">💼 Portfolio & Ledger</a>
                <a href="layout.html" class="universal-menu-item">📐 Layout & Widgets</a>
                <a href="walkthrough.html" class="universal-menu-item">📋 System Walkthrough</a>
                <a href="about.html" class="universal-menu-item">ℹ️ About</a>
            </div>
        </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);

    // Live Clock Update
    function updateClock() {
        const clockEl = document.getElementById('global-nav-clock');
        if (clockEl) {
            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const dayStr = days[now.getDay()];
            const monthStr = months[now.getMonth()];
            const dateNum = now.getDate();
            
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const mins = String(now.getMinutes()).padStart(2, '0');
            const secs = String(now.getSeconds()).padStart(2, '0');

            clockEl.innerText = `${dayStr}, ${monthStr} ${dateNum} · ${hours}:${mins}:${secs} ${ampm}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Global Refresh Trigger Handler
    window.handleNavRefresh = function() {
        if (typeof window.manualRefresh === 'function') {
            window.manualRefresh();
        } else {
            window.location.reload();
        }
    };

    // Universal Menu Toggle Logic
    window.toggleUniversalMenu = function(e) {
        if (e) e.stopPropagation();
        const dd = document.getElementById('universal-menu-dropdown');
        if (dd) dd.classList.toggle('open');
    };

    // Close Universal Menu on outside click or Escape
    document.addEventListener('click', () => {
        const dd = document.getElementById('universal-menu-dropdown');
        if (dd && dd.classList.contains('open')) dd.classList.remove('open');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const dd = document.getElementById('universal-menu-dropdown');
            if (dd && dd.classList.contains('open')) dd.classList.remove('open');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalNav);
} else {
    initGlobalNav();
}
