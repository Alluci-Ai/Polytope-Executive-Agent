
import os
from cryptography.fernet import Fernet
from typing import Dict, Any
import json

class VaultManager:
    def __init__(self, master_key: str):
        self.fernet = Fernet(master_key.encode())
        self.base_path = os.path.expanduser("~/.polytope/vaults")
        os.makedirs(self.base_path, exist_ok=True)

    def store_secret(self, bridge_id: str, data: Dict[str, Any]):
        encrypted = self.fernet.encrypt(json.dumps(data).encode())
        vault_file = os.path.join(self.base_path, f"{bridge_id}.vault")
        with open(vault_file, "wb") as f:
            f.write(encrypted)

    def retrieve_secret(self, bridge_id: str) -> Dict[str, Any]:
        vault_file = os.path.join(self.base_path, f"{bridge_id}.vault")
        if not os.path.exists(vault_file):
            return {}
        with open(vault_file, "rb") as f:
            decrypted = self.fernet.decrypt(f.read())
            return json.loads(decrypted.decode())

    def rotate_vault_keys(self, new_key: str):
        new_fernet = Fernet(new_key.encode())
        for f in os.listdir(self.base_path):
            if f.endswith(".vault"):
                path = os.path.join(self.base_path, f)
                data = self.retrieve_secret(f.replace(".vault", ""))
                encrypted = new_fernet.encrypt(json.dumps(data).encode())
                with open(path, "wb") as vault_f:
                    vault_f.write(encrypted)
        self.fernet = new_fernet
