
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BridgeAdapter(ABC):
    def __init__(self, bridge_id: str, vault_path: str):
        self.bridge_id = bridge_id
        self.vault_path = vault_path

    @abstractmethod
    async def connect(self, credentials: Dict[str, Any]) -> bool:
        """Initialize secure connection to the manifold provider."""
        pass

    @abstractmethod
    async def send_message(self, recipient: str, content: str) -> Dict[str, Any]:
        """Transmit data through the secure tunnel."""
        pass

    @abstractmethod
    async def fetch_unread(self) -> List[Dict[str, Any]]:
        """Retrieve recent communications for processing."""
        pass

    @abstractmethod
    async def validate_encryption(self) -> bool:
        """Verify the E2E integrity of the bridge."""
        pass
