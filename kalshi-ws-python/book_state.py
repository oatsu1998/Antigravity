"""
Module C: Order Book Manager (book_state.py)
Maintains in-memory Level 2 order books (snapshots + deltas) and calculates implied probabilities,
grouped by prop categories (game_lines, player_props, team_props, period_lines).
"""

import logging
from typing import Dict, Optional, Tuple, Any, List

logger = logging.getLogger(__name__)


class OrderBookState:
    """
    Manages in-memory L2 order books for multiple Kalshi market tickers,
    organizing results into tab categories for UI/API consumption.
    """

    def __init__(self):
        # self.books[ticker] = { 'yes': { price: qty }, 'no': { price: qty } }
        self.books: Dict[str, Dict[str, Dict[float, float]]] = {}
        self.has_snapshot: Dict[str, bool] = {}
        self.market_meta: Dict[str, Dict[str, Any]] = {}

    def register_market_metadata(self, categorized_markets: Dict[str, List[Dict]]):
        """Registers market titles and category mapping for tickers."""
        for category, markets in categorized_markets.items():
            for m in markets:
                ticker = m.get("ticker")
                if ticker:
                    self.market_meta[ticker] = {
                        "category": category,
                        "title": m.get("title") or m.get("subtitle") or ticker,
                        "event_ticker": m.get("event_ticker"),
                        "floor_strike": m.get("floor_strike")
                    }

    def clear(self, ticker: Optional[str] = None):
        """Invalidates and clears order book state for a specific ticker or all tickers."""
        if ticker:
            self.books[ticker] = {"yes": {}, "no": {}}
            self.has_snapshot[ticker] = False
        else:
            self.books.clear()
            self.has_snapshot.clear()
            logger.info("Cleared all order book states.")

    def apply_snapshot(self, data: Dict[str, Any]):
        """
        Handles 'orderbook_snapshot' message:
        Clears existing book state for ticker and populates both YES and NO levels.
        """
        msg = data.get("msg", {}) if "msg" in data else data
        ticker = msg.get("market_ticker") or msg.get("ticker")
        if not ticker:
            return

        self.books[ticker] = {"yes": {}, "no": {}}

        # Parse YES levels: list of [price, qty] or list of dicts
        yes_levels = msg.get("yes_dollars") or msg.get("yes") or []
        for level in yes_levels:
            if isinstance(level, list) and len(level) >= 2:
                price = float(level[0])
                qty = float(level[1])
                if qty > 0:
                    self.books[ticker]["yes"][price] = qty
            elif isinstance(level, dict):
                price = float(level.get("price_dollars", level.get("price", 0)))
                qty = float(level.get("quantity_fp", level.get("quantity", 0)))
                if qty > 0:
                    self.books[ticker]["yes"][price] = qty

        # Parse NO levels: list of [price, qty] or list of dicts
        no_levels = msg.get("no_dollars") or msg.get("no") or []
        for level in no_levels:
            if isinstance(level, list) and len(level) >= 2:
                price = float(level[0])
                qty = float(level[1])
                if qty > 0:
                    self.books[ticker]["no"][price] = qty
            elif isinstance(level, dict):
                price = float(level.get("price_dollars", level.get("price", 0)))
                qty = float(level.get("quantity_fp", level.get("quantity", 0)))
                if qty > 0:
                    self.books[ticker]["no"][price] = qty

        self.has_snapshot[ticker] = True
        logger.debug(f"[SNAPSHOT] Loaded L2 book for {ticker}")

    def apply_delta(self, data: Dict[str, Any]):
        """
        Handles 'orderbook_delta' message:
        Applies quantity changes or deletes levels when quantity/delta reaches 0.
        Blocks updates if snapshot has not been received yet.
        """
        msg = data.get("msg", {}) if "msg" in data else data
        ticker = msg.get("market_ticker") or msg.get("ticker")
        if not ticker or not self.has_snapshot.get(ticker):
            # Ignore deltas until snapshot is received
            return

        side = (msg.get("side") or "yes").lower()
        if side not in ("yes", "no"):
            side = "yes"

        price_raw = msg.get("price_dollars") if "price_dollars" in msg else msg.get("price")
        if price_raw is None:
            return
        price = float(price_raw)

        delta_fp = float(msg.get("delta_fp", msg.get("delta", 0)))
        qty_fp = msg.get("quantity_fp") if "quantity_fp" in msg else msg.get("quantity")

        current_qty = self.books[ticker][side].get(price, 0.0)

        if qty_fp is not None:
            new_qty = float(qty_fp)
        else:
            new_qty = current_qty + delta_fp

        if new_qty <= 0:
            self.books[ticker][side].pop(price, None)
        else:
            self.books[ticker][side][price] = new_qty

    def get_implied_probability(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Calculates best YES bid, best NO bid, YES ask (1.00 - best_no_bid),
        and mid-market implied probability for a ticker.
        """
        if not self.has_snapshot.get(ticker) or ticker not in self.books:
            return None

        book = self.books[ticker]
        yes_bids = [p for p, q in book["yes"].items() if q > 0]
        no_bids = [p for p, q in book["no"].items() if q > 0]

        best_yes_bid = max(yes_bids) if yes_bids else None
        best_no_bid = max(no_bids) if no_bids else None

        # YES Ask is implied by Best NO Bid (1.00 - best_no_bid)
        yes_ask = (1.0 - best_no_bid) if best_no_bid is not None else None

        implied_prob = None
        if best_yes_bid is not None and yes_ask is not None:
            implied_prob = (best_yes_bid + yes_ask) / 2.0
        elif best_yes_bid is not None:
            implied_prob = best_yes_bid
        elif yes_ask is not None:
            implied_prob = yes_ask

        meta = self.market_meta.get(ticker, {})

        return {
            "ticker": ticker,
            "title": meta.get("title", ticker),
            "category": meta.get("category", "other_props"),
            "best_yes_bid": best_yes_bid,
            "best_no_bid": best_no_bid,
            "yes_ask": yes_ask,
            "implied_probability": implied_prob,
            "formatted_prob": f"{implied_prob * 100:.1f}%" if implied_prob is not None else "N/A"
        }

    def get_categorized_book_summary(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Groups all active in-memory books by category:
        game_lines, player_props, team_props, period_lines, other_props.
        """
        summary: Dict[str, List[Dict[str, Any]]] = {
            "game_lines": [],
            "player_props": [],
            "team_props": [],
            "period_lines": [],
            "other_props": []
        }

        for ticker in list(self.books.keys()):
            prob_info = self.get_implied_probability(ticker)
            if prob_info:
                cat = prob_info.get("category", "other_props")
                if cat not in summary:
                    summary[cat] = []
                summary[cat].append(prob_info)

        return summary
