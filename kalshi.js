// This runs on Vercel's server, not the browser — so CORS doesn't apply here.
// File location: /api/kalshi.js in your project root.
//
// Note: Kalshi's `category=Sports` filter on the general /markets endpoint currently
// returns only auto-generated multi-leg "combo" markets (tickers containing MVE),
// which read as confusing concatenated titles rather than a normal single-team
// market. The clean single-game "Will Team X win?" markets live under specific
// per-league series instead, so we query those directly and merge the results.

const SERIES = ['KXMLBGAME', 'KXNFLGAME', 'KXNBAGAME', 'KXNHLGAME', 'KXNCAAFGAME', 'KXWNBAGAME'];

export default async function handler(req, res) {
  try {
    const results = await Promise.all(
      SERIES.map(async (series) => {
        try {
          const r = await fetch(
            `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=${series}&status=open&limit=100`
          );
          if (!r.ok) return [];
          const d = await r.json();
          return d.markets || [];
        } catch {
          return [];
        }
      })
    );

    const markets = results.flat();

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.status(200).json({ markets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
