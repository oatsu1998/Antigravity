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
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            position: sticky;
            top: 0;
            z-index: 1000;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
        }
        .global-nav-brand {
            color: #f59e0b;
            font-weight: bold;
            margin-right: 32px;
            text-transform: uppercase;
            letter-spacing: 2px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .global-nav-links {
            display: flex;
            gap: 20px;
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
    const isHistory = currentPath.toLowerCase().includes('history');
    const isKalshi = currentPath.toLowerCase().includes('kalshi');
    const isSandbox = currentPath.toLowerCase().includes('sandbox');
    const isPortfolio = currentPath.toLowerCase().includes('portfolio');
    const isLayout = currentPath.toLowerCase().includes('layout');

    // Get current bankroll from localStorage or state manager
    const savedBankroll = parseFloat(localStorage.getItem('bankroll')) || 10000.00;
    const formattedBankroll = '$' + savedBankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Inject HTML
    const nav = document.createElement('nav');
    nav.className = 'global-nav';
    nav.innerHTML = `
        <div style="display:flex; align-items:center;">
            <div class="global-nav-brand">DESTINY NETWORK</div>
            <div class="global-nav-links">
                <a href="index.html" class="global-nav-link ${(!isLineTracker && !isProps && !isMyBets && !isHistory && !isKalshi && !isSandbox && !isPortfolio && !isLayout) ? 'active' : ''}">Command Center</a>
                <a href="line-tracker.html" class="global-nav-link ${isLineTracker ? 'active' : ''}">Line Tracker</a>
                <a href="history.html" class="global-nav-link ${isHistory ? 'active' : ''}">History</a>
                <a href="props.html" class="global-nav-link ${isProps ? 'active' : ''}">Props</a>
                <a href="my-bets.html" class="global-nav-link ${isMyBets ? 'active' : ''}">My Bets</a>
                <a href="kalshi.html" class="global-nav-link ${isKalshi ? 'active' : ''}">Kalshi</a>
                <a href="sandbox.html" class="global-nav-link ${isSandbox ? 'active' : ''}">Sandbox</a>
                <a href="portfolio.html" class="global-nav-link ${isPortfolio ? 'active' : ''}">Portfolio</a>
                <a href="layout.html" class="global-nav-link ${isLayout ? 'active' : ''}">Layout</a>
            </div>
        </div>
        <div class="nav-bankroll-pill">
            <span>BANKROLL:</span>
            <span class="nav-bankroll-val bankroll-amount">${formattedBankroll}</span>
        </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalNav);
} else {
    initGlobalNav();
}
