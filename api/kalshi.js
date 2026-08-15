// This runs on Vercel's server, not the browser — so CORS doesn't apply here.
// File location: /api/kalshi.js in your project root.

export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.elections.kalshi.com/trade-api/v2/markets?limit=50&status=open&category=Sports'
    );

    if (!response.ok) {
      res.status(502).json({ error: 'Kalshi API returned status ' + response.status });
      return;
    }

    const data = await response.json();

    // Only pass through sports markets — filter defensively in case category param is ignored
    const sportsMarkets = (data.markets || []).filter(m => {
      const cat = (m.category || '').toLowerCase();
      return cat.includes('sport') || cat === '';
    });

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.status(200).json({ markets: sportsMarkets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
