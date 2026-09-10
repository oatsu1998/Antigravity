"""
Module D: Resiliency & Heartbeat Manager (connection_manager.py)
Implements exponential backoff auto-reconnection, stale state invalidation,
and WebSocket lifecycle management.
"""

import asyncio
import logging
import random
from typing import List, Optional, Callable
from ws_client import KalshiWSClient
from book_state import OrderBookState

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket lifecycle, auto-reconnections with exponential backoff + jitter,
    and stale state invalidation upon connection loss.
    """

    def __init__(
        self,
        ws_client: KalshiWSClient,
        book_state: OrderBookState,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        max_attempts: Optional[int] = None
    ):
        self.ws_client = ws_client
        self.book_state = book_state
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.max_attempts = max_attempts
        self.is_running = False

    async def run_forever(self, tickers: List[str]):
        """
        Runs the WebSocket connection loop continuously with exponential backoff auto-retry.
        Invalidates stale order book state whenever connection breaks or resets.
        """
        self.is_running = True
        attempt = 0

        while self.is_running:
            try:
                logger.info(f"Initiating WebSocket connection (Attempt {attempt + 1})...")
                attempt += 1

                # Invalidate stale order book state before connecting/subscribing
                self.book_state.clear()

                # Start WS connection and subscription loop
                await self.ws_client.connect_and_subscribe(tickers)

                # Reset attempt count if connection was established and ran successfully
                attempt = 0

            except asyncio.CancelledError:
                logger.info("Connection manager loop canceled.")
                self.is_running = False
                break
            except Exception as e:
                logger.error(f"WebSocket connection error: {e}")

            if not self.is_running:
                break

            if self.max_attempts and attempt >= self.max_attempts:
                logger.error(f"Max reconnection attempts ({self.max_attempts}) reached. Stopping.")
                break

            # Calculate exponential backoff with random jitter
            delay = min(self.max_delay, self.base_delay * (2 ** (attempt - 1)))
            jitter = random.uniform(0, 0.5 * delay)
            total_delay = delay + jitter

            # Invalidate order book state on disconnect so stale updates are rejected
            self.book_state.clear()

            logger.warning(f"Connection lost. Reconnecting in {total_delay:.2f} seconds...")
            await asyncio.sleep(total_delay)

    def stop(self):
        """Stops the connection manager loop."""
        self.is_running = False
        self.book_state.clear()
