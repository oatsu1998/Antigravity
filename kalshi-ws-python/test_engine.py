"""
Comprehensive Unit & Integration Test Suite for Kalshi Multi-Prop Ingestion Engine (test_engine.py)
"""

import asyncio
import json
import unittest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from auth import KalshiAuth
from book_state import OrderBookState, prob_to_american_odds
from market_resolver import MarketResolver, categorize_market
from main import format_ticker_log
from ws_client import KalshiWSClient


class TestKalshiAuth(unittest.TestCase):
    """Verifies RSA-SHA256 signature generation and header construction."""

    def setUp(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        pem = self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        self.auth = KalshiAuth(key_id="TEST_KEY_ID_123", private_key_pem=pem)

    def test_auth_configuration(self):
        self.assertTrue(self.auth.is_configured())
        self.assertEqual(self.auth.key_id, "TEST_KEY_ID_123")

    def test_signature_generation(self):
        timestamp_ms = "1750000000000"
        sig = self.auth.generate_signature("GET", "/trade-api/ws/v2", timestamp_ms)
        self.assertIsInstance(sig, str)
        self.assertGreater(len(sig), 50)

    def test_auth_headers(self):
        headers = self.auth.get_auth_headers("GET", "/trade-api/v2/markets")
        self.assertIn("KALSHI-ACCESS-KEY", headers)
        self.assertIn("KALSHI-ACCESS-TIMESTAMP", headers)
        self.assertIn("KALSHI-ACCESS-SIGNATURE", headers)


class TestAmericanOddsConversion(unittest.TestCase):
    """Verifies formula P > 0.50 -> -(P/(1-P))*100 and P < 0.50 -> +((1-P)/P)*100."""

    def test_favorite_odds(self):
        # P = 0.52 -> -(0.52 / 0.48)*100 = -108.33 -> -108
        self.assertEqual(prob_to_american_odds(0.52), "-108")
        # P = 0.60 -> -(0.60 / 0.40)*100 = -150
        self.assertEqual(prob_to_american_odds(0.60), "-150")
        # P = 0.81 -> -(0.81 / 0.19)*100 = -426
        self.assertEqual(prob_to_american_odds(0.81), "-426")

    def test_underdog_odds(self):
        # P = 0.47 -> +((0.53) / 0.47)*100 = +112.76 -> +113
        self.assertEqual(prob_to_american_odds(0.47), "+113")
        # P = 0.40 -> +((0.60) / 0.40)*100 = +150
        self.assertEqual(prob_to_american_odds(0.40), "+150")

    def test_even_odds(self):
        self.assertEqual(prob_to_american_odds(0.50), "+100")


class TestMarketCategorization(unittest.TestCase):
    """Verifies multi-prop categorization rules."""

    def test_game_lines(self):
        m = {"ticker": "KXNFLGAME-26SEP09NESEA-NE", "title": "New England Patriots to win"}
        self.assertEqual(categorize_market(m), "game_lines")

    def test_player_props(self):
        m = {"ticker": "KXNFL-26SEP09-MAYEPASS-225", "title": "Drake Maye: 225+ Passing Yards"}
        self.assertEqual(categorize_market(m), "player_props")


class TestOrderBookState(unittest.TestCase):
    """Verifies Level-2 order book snapshots, deltas, and American odds."""

    def setUp(self):
        self.book = OrderBookState()
        self.ticker = "KXNFL-26SEP09-NE-SEA"
        categorized = {
            "game_lines": [
                {"ticker": self.ticker, "title": "NE Patriots vs SEA Seahawks", "category": "game_lines"}
            ]
        }
        self.book.register_market_metadata(categorized)

    def test_snapshot_and_american_odds(self):
        snapshot_msg = {
            "type": "orderbook_snapshot",
            "market_ticker": self.ticker,
            "yes_dollars": [[0.50, 100], [0.52, 50]],
            "no_dollars": [[0.45, 80], [0.47, 60]]
        }
        self.book.apply_snapshot(snapshot_msg)

        prob_info = self.book.get_implied_probability(self.ticker)
        self.assertIsNotNone(prob_info)
        self.assertEqual(prob_info["best_yes_bid"], 0.52)
        self.assertEqual(prob_info["best_no_bid"], 0.47)
        self.assertAlmostEqual(prob_info["implied_probability"], 0.525, places=4)
        self.assertEqual(prob_info["american_odds"], "-111")


class TestAsyncQueueDispatcher(unittest.IsolatedAsyncioTestCase):
    """Verifies asynchronous queue offloading."""

    async def test_queue_processing(self):
        book_state = OrderBookState()
        updates = []

        def on_update(prob_info):
            updates.append(prob_info)

        client = KalshiWSClient(auth=None, book_state=book_state, on_ticker_update=on_update)
        dispatcher_task = asyncio.create_task(client._process_queue())

        ticker = "KXNFL-TEST-TICKER"

        snapshot_msg = {
            "type": "orderbook_snapshot",
            "market_ticker": ticker,
            "yes_dollars": [[0.60, 10]],
            "no_dollars": [[0.35, 10]]
        }
        await client.queue.put(json.dumps(snapshot_msg))

        ticker_msg = {
            "type": "ticker",
            "market_ticker": ticker
        }
        await client.queue.put(json.dumps(ticker_msg))

        await client.queue.join()

        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0]["ticker"], ticker)
        self.assertEqual(updates[0]["american_odds"], "-167")

        dispatcher_task.cancel()


if __name__ == "__main__":
    unittest.main()
