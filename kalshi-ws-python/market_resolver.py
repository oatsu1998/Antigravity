"""
Module A: Multi-Prop Market Discovery (market_resolver.py)
Discovers and categorizes active Kalshi sports markets (Game Lines, Player Props,
Team Props, Period Lines) by event or series, outputting market tickers for WS batch subscription.
"""

import logging
from typing import List, Dict, Optional, Tuple, Set
import requests
from auth import KalshiAuth

logger = logging.getLogger(__name__)

# REST Endpoint Definitions
ENDPOINTS = {
    "prod": "https://external-api.kalshi.com/trade-api/v2",
    "demo": "https://external-api.demo.kalshi.co/trade-api/v2",
    "public": "https://api.elections.kalshi.com/trade-api/v2"
}

# Standard Kalshi Sports Series Prefixes
DEFAULT_SPORTS_SERIES = [
    "KXNFLGAME", "KXNFLSPREAD", "KXNFLTOTAL",
    "KXNBAGAME", "KXNBASPREAD", "KXNBATOTAL",
    "KXMLBGAME", "KXMLBSPREAD", "KXMLBTOTAL"
]


def categorize_market(market: Dict) -> str:
    """
    Categorizes a market object into one of:
    - game_lines (Moneyline, Point Spread, Total Points)
    - player_props (Passing, Rushing, Receiving, Touchdowns, Player Stats)
    - team_props (Team Totals, First to Score, Team Specific Props)
    - period_lines (1Q, 1H, 2H, 4Q, Quarters, Halves)
    - other_props (Fallback for unclassified prop markets)
    """
    ticker = (market.get("ticker") or "").upper()
    event_ticker = (market.get("event_ticker") or "").upper()
    title = (market.get("title") or "").lower()
    sub_title = (market.get("yes_sub_title") or market.get("subtitle") or "").lower()
    cat = (market.get("category") or "").lower()
    sub_cat = (market.get("sub_category") or "").lower()
    text = f"{title} {sub_title} {cat} {sub_cat}".lower()

    # 1. Period Lines (1Q, 1H, 2H, 4Q, Quarters, Halves)
    period_keywords = [
        "1q", "2q", "3q", "4q", "1h", "2h", "1st quarter", "2nd quarter",
        "3rd quarter", "4th quarter", "1st half", "2nd half", "first half",
        "second half", "first quarter", "fourth quarter"
    ]
    if any(kw in text for kw in period_keywords) or any(kw in ticker for kw in ["1Q", "2Q", "3Q", "4Q", "1H", "2H"]):
        return "period_lines"

    # 2. Team Props (Team Totals, First to Score, Team Points)
    team_keywords = ["team total", "team points", "first to score", "score first", "field goals"]
    if any(kw in text for kw in team_keywords) or "team" in cat or "team" in sub_cat:
        return "team_props"

    # 3. Player Props (Passing, Rushing, Receiving, Touchdowns, Player Stats)
    player_keywords = [
        "pass", "passing", "rush", "rushing", "rec", "receiving", "reception",
        "touchdown", "td", "interception", "completion", "yards", "player",
        "assists", "rebounds"
    ]
    if any(kw in text for kw in player_keywords) or "player" in cat or "player" in sub_cat:
        return "player_props"

    # 4. Game Lines (Full Game Winner, Spread, Total)
    if any(kw in ticker for kw in ["GAME", "SPREAD", "TOTAL"]) or any(kw in text for kw in ["moneyline", "winner", "spread", "total"]):
        return "game_lines"

    return "other_props"


class MarketResolver:
    """
    Handles multi-prop discovery and categorization of active Kalshi sports markets.
    """

    def __init__(self, auth: Optional[KalshiAuth] = None, env: str = "prod"):
        self.auth = auth
        self.env = env.lower()
        self.base_url = ENDPOINTS.get(self.env, ENDPOINTS["prod"])

    def _make_request(self, path: str, params: Dict) -> List[Dict]:
        """Internal helper to execute REST requests with Auth fallback."""
        url = f"{self.base_url}{path}"
        headers = {}
        if self.auth and self.auth.is_configured():
            headers = self.auth.get_auth_headers("GET", path)

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            if resp.status_code != 200 and self.env != "public":
                public_url = f"{ENDPOINTS['public']}{path}"
                resp = requests.get(public_url, params=params, timeout=10)

            resp.raise_for_status()
            data = resp.json()
            return data.get("markets", [])
        except Exception as e:
            logger.error(f"Error fetching path {path} with params {params}: {e}")
            return []

    def fetch_markets_for_event(self, event_ticker: str) -> List[Dict]:
        """
        Fetches all active markets for a specific event ticker.
        GET /trade-api/v2/markets?event_ticker={event_ticker}&status=open
        """
        path = "/markets"
        params = {"event_ticker": event_ticker, "status": "open", "limit": "1000"}
        return self._make_request(path, params)

    def fetch_markets_for_series(self, series_ticker: str, limit: int = 1000) -> List[Dict]:
        """
        Fetches open markets for a given series ticker.
        GET /trade-api/v2/markets?series_ticker={series}&status=open
        """
        path = "/markets"
        params = {"series_ticker": series_ticker, "status": "open", "limit": str(limit)}
        return self._make_request(path, params)

    def resolve_categorized_markets(
        self,
        event_tickers: Optional[List[str]] = None,
        series_list: Optional[List[str]] = None,
        team_pair: Optional[Tuple[str, str]] = None
    ) -> Tuple[Dict[str, List[Dict]], List[str]]:
        """
        Discovers all active sports and prop markets, categorizing them into:
        game_lines, player_props, team_props, period_lines, other_props.

        Returns:
            Tuple of (categorized_dict, batch_ws_tickers_list)
        """
        raw_markets: List[Dict] = []

        # 1. Fetch by Event Tickers if provided
        if event_tickers:
            for et in event_tickers:
                raw_markets.extend(self.fetch_markets_for_event(et))

        # 2. Fetch by Series List
        target_series = series_list or DEFAULT_SPORTS_SERIES
        for series in target_series:
            raw_markets.extend(self.fetch_markets_for_series(series))

        team_a = team_pair[0].upper() if team_pair else None
        team_b = team_pair[1].upper() if team_pair else None

        categorized: Dict[str, List[Dict]] = {
            "game_lines": [],
            "player_props": [],
            "team_props": [],
            "period_lines": [],
            "other_props": []
        }
        seen_tickers: Set[str] = set()

        for m in raw_markets:
            ticker = m.get("ticker")
            if not ticker or ticker in seen_tickers:
                continue

            event_ticker = (m.get("event_ticker") or "").upper()
            sub_title = (m.get("yes_sub_title") or m.get("title") or "").upper()
            m_tick = ticker.upper()

            # Apply team filter if provided
            if team_a and team_b:
                matches_team = (team_a in event_ticker and team_b in event_ticker) or \
                               (team_a in m_tick and team_b in m_tick) or \
                               (team_a in sub_title or team_b in sub_title)
                if not matches_team:
                    continue

            seen_tickers.add(ticker)
            category = categorize_market(m)

            market_summary = {
                "ticker": ticker,
                "event_ticker": m.get("event_ticker"),
                "title": m.get("title"),
                "subtitle": m.get("yes_sub_title") or m.get("subtitle"),
                "category": category,
                "floor_strike": m.get("floor_strike")
            }
            categorized[category].append(market_summary)

        ws_tickers = sorted(list(seen_tickers))
        total_count = len(ws_tickers)
        logger.info(
            f"Resolved {total_count} markets across categories: "
            f"Game Lines: {len(categorized['game_lines'])}, "
            f"Player Props: {len(categorized['player_props'])}, "
            f"Team Props: {len(categorized['team_props'])}, "
            f"Period Lines: {len(categorized['period_lines'])}"
        )

        return categorized, ws_tickers

    def resolve_active_tickers(
        self,
        series_list: Optional[List[str]] = None,
        team_pair: Optional[Tuple[str, str]] = None
    ) -> List[str]:
        """Backward-compatible helper returning flat list of tickers."""
        _, tickers = self.resolve_categorized_markets(series_list=series_list, team_pair=team_pair)
        return tickers
