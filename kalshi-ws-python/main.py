"""
Main Application Orchestrator for Kalshi Multi-Prop Ingestion Engine (main.py)
"""

import argparse
import asyncio
import logging
import os
import sys
from typing import Dict, List
from dotenv import load_dotenv

from auth import KalshiAuth
from market_resolver import MarketResolver
from book_state import OrderBookState
from ws_client import KalshiWSClient
from connection_manager import ConnectionManager

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("KalshiMultiPropEngine")

# Load .env file if present
load_dotenv()


def format_ticker_log(prob_info: Dict) -> str:
    """
    Formats parsed order book update matching criteria:
    [TICKER] (Category) Title | YES Bid: $0.52 | NO Bid: $0.47 | Implied Prob: 52.5%
    """
    ticker = prob_info.get("ticker", "UNKNOWN")
    title = prob_info.get("title") or ticker
    category = (prob_info.get("category") or "PROP").upper()
    yes_bid = prob_info.get("best_yes_bid")
    no_bid = prob_info.get("best_no_bid")
    formatted_prob = prob_info.get("formatted_prob", "N/A")

    yes_str = f"${yes_bid:.2f}" if yes_bid is not None else "N/A"
    no_str = f"${no_bid:.2f}" if no_bid is not None else "N/A"

    return f"[{category}] {ticker} ({title}) | YES Bid: {yes_str} | NO Bid: {no_str} | Implied Prob: {formatted_prob}"


async def main_async(series_list: List[str], event_tickers: List[str], team_pair: tuple, env: str):
    logger.info("Initializing Kalshi Multi-Prop Real-Time Ingestion Engine...")

    # Step 1: Initialize Auth
    auth = KalshiAuth(env=env)
    if auth.is_configured():
        logger.info(f"Loaded Kalshi RSA Auth Key ID: {auth.key_id}")
    else:
        logger.warning("No RSA key loaded. Operating in public/unauthenticated discovery mode.")

    # Step 2: Multi-Prop Market Discovery (Module A Update)
    resolver = MarketResolver(auth=auth, env=env)
    categorized_markets, ws_tickers = resolver.resolve_categorized_markets(
        event_tickers=event_tickers,
        series_list=series_list,
        team_pair=team_pair
    )

    if not ws_tickers:
        logger.warning("No active markets discovered for requested filters. Using default test tickers.")
        ws_tickers = ["KXNFLGAME-26SEP09NESEA", "KXNFLSPREAD-26SEP09NESEA", "KXNFLTOTAL-26SEP09NESEA"]

    # Step 3: Initialize Order Book State & Register Metadata (Module C Update)
    book_state = OrderBookState()
    book_state.register_market_metadata(categorized_markets)

    def on_ticker_update(prob_info: Dict):
        log_msg = format_ticker_log(prob_info)
        logger.info(log_msg)

    # Step 4: Initialize WebSocket Client & Batch Subscription (Module B Update)
    ws_client = KalshiWSClient(
        auth=auth,
        book_state=book_state,
        env=env,
        on_ticker_update=on_ticker_update
    )

    # Step 5: Connection Manager (Module D)
    conn_manager = ConnectionManager(
        ws_client=ws_client,
        book_state=book_state
    )

    try:
        await conn_manager.run_forever(ws_tickers)
    except KeyboardInterrupt:
        logger.info("Shutting down engine...")
    finally:
        conn_manager.stop()
        await ws_client.close()


def main():
    parser = argparse.ArgumentParser(description="Kalshi Multi-Prop Real-Time Odds Engine")
    parser.add_argument("--env", type=str, default=os.getenv("KALSHI_ENV", "prod"), help="Target environment: prod or demo")
    parser.add_argument("--series", type=str, nargs="+", default=["KXNFLGAME", "KXNFLSPREAD", "KXNFLTOTAL"], help="Series tickers to monitor")
    parser.add_argument("--events", type=str, nargs="+", default=None, help="Specific event tickers to monitor")
    parser.add_argument("--team-a", type=str, default="NE", help="First team abbreviation (e.g. NE)")
    parser.add_argument("--team-b", type=str, default="SEA", help="Second team abbreviation (e.g. SEA)")

    args = parser.parse_args()
    team_pair = (args.team_a, args.team_b) if args.team_a and args.team_b else None

    try:
        asyncio.run(main_async(series_list=args.series, event_tickers=args.events, team_pair=team_pair, env=args.env))
    except KeyboardInterrupt:
        logger.info("Application exited by user.")


if __name__ == "__main__":
    main()
