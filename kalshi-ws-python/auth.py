"""
Kalshi API v2 Authentication Module (RSA-SHA256 PSS)
"""

import base64
import os
import time
from urllib.parse import urlparse
from typing import Dict, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key


class KalshiAuth:
    """
    Handles RSA-SHA256 (RSASSA-PSS with MGF1 SHA256) signature generation
    for Kalshi REST API endpoints and WebSocket handshakes.
    """

    def __init__(
        self,
        key_id: Optional[str] = None,
        private_key_path: Optional[str] = None,
        private_key_pem: Optional[bytes] = None,
        env: Optional[str] = None,
    ):
        self.key_id = key_id or os.getenv("KALSHI_KEY_ID", "")
        self.env = (env or os.getenv("KALSHI_ENV", "prod")).lower()

        # Load private key from PEM bytes or file path
        self.private_key = None
        if private_key_pem:
            self.private_key = load_pem_private_key(private_key_pem, password=None)
        else:
            path = private_key_path or os.getenv("KALSHI_PRIVATE_KEY_PATH", "")
            if path and os.path.exists(path):
                with open(path, "rb") as f:
                    self.private_key = load_pem_private_key(f.read(), password=None)

    def is_configured(self) -> bool:
        """Checks if key ID and private key are loaded."""
        return bool(self.key_id and self.private_key)

    def generate_signature(self, method: str, path: str, timestamp_ms: str) -> str:
        """
        Constructs signature payload: timestamp_ms + METHOD + PATH
        and signs it using RSA-PSS SHA256.
        """
        if not self.private_key:
            raise ValueError("Kalshi private key is not initialized.")

        # Ensure path strips query parameters
        parsed_path = urlparse(path).path

        # Payload construction: timestamp + METHOD + PATH
        msg_str = f"{timestamp_ms}{method.upper()}{parsed_path}"
        msg_bytes = msg_str.encode("utf-8")

        signature_bytes = self.private_key.sign(
            msg_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.DIGEST_LENGTH,
            ),
            hashes.SHA256(),
        )

        return base64.b64encode(signature_bytes).decode("utf-8")

    def get_auth_headers(self, method: str, path: str) -> Dict[str, str]:
        """
        Returns required Kalshi access headers for REST/WS requests.
        """
        if not self.is_configured():
            return {}

        timestamp_ms = str(int(time.time() * 1000))
        signature = self.generate_signature(method, path, timestamp_ms)

        return {
            "KALSHI-ACCESS-KEY": self.key_id,
            "KALSHI-ACCESS-TIMESTAMP": timestamp_ms,
            "KALSHI-ACCESS-SIGNATURE": signature,
        }
