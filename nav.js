function initGlobalNav() {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .global-nav {
            background: #000;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0 20px;
            display: flex;
            align-items: center;
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
        }
        .global-nav-links {
            display: flex;
            gap: 20px;
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
    `;
    document.head.appendChild(style);

    // Determine current page for active state
    const currentPath = window.location.pathname;
    const isLineTracker = currentPath.toLowerCase().includes('line-tracker');
    const isProps = currentPath.toLowerCase().includes('props');
    const isMyBets = currentPath.toLowerCase().includes('my-bets');
    const isKalshi = currentPath.toLowerCase().includes('kalshi');
    const isSandbox = currentPath.toLowerCase().includes('sandbox');

    // Inject HTML
    const nav = document.createElement('nav');
    nav.className = 'global-nav';
    nav.innerHTML = `
        <div class="global-nav-brand">DESTINY NETWORK</div>
        <div class="global-nav-links">
            <a href="index.html" class="global-nav-link ${(!isLineTracker && !isProps && !isMyBets && !isKalshi && !isSandbox) ? 'active' : ''}">Command Center</a>
            <a href="line-tracker.html" class="global-nav-link ${isLineTracker ? 'active' : ''}">Line Tracker</a>
            <a href="props.html" class="global-nav-link ${isProps ? 'active' : ''}">Props</a>
            <a href="my-bets.html" class="global-nav-link ${isMyBets ? 'active' : ''}">My Bets</a>
            <a href="kalshi.html" class="global-nav-link ${isKalshi ? 'active' : ''}">Kalshi</a>
            <a href="sandbox.html" class="global-nav-link ${isSandbox ? 'active' : ''}">Sandbox</a>
        </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalNav);
} else {
    initGlobalNav();
}
