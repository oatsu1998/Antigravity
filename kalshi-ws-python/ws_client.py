"""
Module B: Real-Time WebSocket Client (ws_client.py)
Connects to Kalshi WebSocket v2, sends subscriptions, and uses an asyncio.Queue
to prevent backpressure and Kalshi Error Code 25 (Subscription buffer overflow).
"""

import asyncio
import json
import logging
from typing import List, Dict, Optional, Callable
import websockets
from auth import KalshiAuth
from book_state import OrderBookState

logger = logging.getLogger(__name__)

# WebSocket Endpoint Definitions
WS_ENDPOINTS = {
    "prod": "wss://external-api-ws.kalshi.com/trade-api/ws/v2",
    "demo": "wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2"
}


class KalshiWSClient:
    """
    Asynchronous WebSocket client for Kalshi v2 trade feed.
    Offloads incoming frames immediately to an unbounded asyncio.Queue.
    """

    def __init__(
        self,
        auth: KalshiAuth,
        book_state: OrderBookState,
        env: str = "prod",
        on_ticker_update: Optional[Callable[[Dict], None]] = None
    ):
        self.auth = auth
        self.book_state = book_state
        self.env = env.lower()
        self.ws_url = WS_ENDPOINTS.get(self.env, WS_ENDPOINTS["prod"])
        self.on_ticker_update = on_ticker_update

        self.queue: asyncio.Queue = asyncio.Queue()
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.running: bool = False
        self.subscribed_tickers: List[str] = []
        self._dispatcher_task: Optional[asyncio.Task] = None

    async def connect_and_subscribe(self, tickers: List[str]):
        """
        Connects to Kalshi WS server with RSA auth headers, sends subscription command,
        and starts reading frames.
        """
        self.subscribed_tickers = tickers
        ws_path = "/trade-api/ws/v2"

        # Generate fresh authentication headers for WS handshake
        headers = {}
        if self.auth and self.auth.is_configured():
            headers = self.auth.get_auth_headers("GET", ws_path)

        logger.info(f"Connecting to Kalshi WebSocket: {self.ws_url}")

        # Connect with keep-alive ping intervals
        self.websocket = await websockets.connect(
            self.ws_url,
            additional_headers=headers if headers else None,
            ping_interval=20,
            ping_timeout=20
        )
        self.running = True

        # Start background consumer worker reading from asyncio.Queue
        self._dispatcher_task = asyncio.create_task(self._process_queue())

        # Send subscription request for 'ticker' and 'orderbook_delta'
        await self._send_subscription(tickers)

        # Main socket reader loop: reads raw socket and immediately puts on queue
        try:
            async for message in self.websocket:
                # Immediate offload to queue to avoid buffer overflow
                self.queue.put_nowait(message)
        except websockets.ConnectionClosed as e:
            logger.warning(f"WebSocket connection closed: {e}")
        finally:
            self.running = False
            if self._dispatcher_task:
                self._dispatcher_task.cancel()

    async def _send_subscription(self, tickers: List[str]):
        """Sends JSON subscription command for ticker and orderbook_delta channels."""
        if not self.websocket or not tickers:
            return

        sub_msg = {
            "id": 1,
            "cmd": "subscribe",
            "params": {
                "channels": ["ticker", "orderbook_delta"],
                "market_tickers": tickers
            }
        }
        await self.websocket.send(json.dumps(sub_msg))
        logger.info(f"Sent WS subscription for {len(tickers)} tickers.")

    async def _process_queue(self):
        """
        Background worker that processes incoming messages from the queue.
        Decouples network socket reading from processing logic.
        """
        while True:
            try:
                raw_msg = await self.queue.get()
                data = json.loads(raw_msg)
                msg_type = data.get("type") or data.get("cmd")

                if msg_type == "orderbook_snapshot":
                    self.book_state.apply_snapshot(data)
                elif msg_type == "orderbook_delta":
                    self.book_state.apply_delta(data)
                elif msg_type == "ticker":
                    msg = data.get("msg", {}) if isinstance(data.get("msg"), dict) else {}
                    ticker = msg.get("market_ticker") or msg.get("ticker") or data.get("market_ticker") or data.get("ticker")
                    if ticker and self.on_ticker_update:
                        prob_info = self.book_state.get_implied_probability(ticker)
                        if prob_info:
                            self.on_ticker_update(prob_info)

                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error processing WS message from queue: {e}")

    async def close(self):
        """Closes WebSocket connection cleanly."""
        self.running = False
        if self.websocket:
            await self.websocket.close()
        if self._dispatcher_task:
            self._dispatcher_task.cancel()
