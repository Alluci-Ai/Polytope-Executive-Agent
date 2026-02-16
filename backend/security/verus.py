import logging
import hashlib
import json
from typing import Dict, Any
from ..config import Settings

logger = logging.getLogger("SovereignSecurity")

class SovereignIdentity:
    """
    Manages VerusID authentication and cryptographic signing of 
    Executive Manifests.
    """
    def __init__(self, settings: Settings):
        self.verus_id = settings.VERUS_ID_IDENTITY
        self.private_key = settings.VERUS_ID_PRIVATE_KEY
        self.enabled = bool(self.verus_id and self.private_key)
        
        if self.enabled:
            logger.info(f"Sovereign Identity Active: {self.verus_id}")
        else:
            logger.warning("Sovereign Identity Inactive (Standard Mode)")

    def sign_manifest(self, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cryptographically signs an execution plan (Manifest).
        If Verus is not configured, performs a standard hash.
        """
        payload_str = json.dumps(manifest, sort_keys=True)
        
        if not self.enabled:
            # Standard Hash
            signature = hashlib.sha256(payload_str.encode()).hexdigest()
            return {
                "manifest": manifest,
                "signature": signature,
                "signer": "LOCAL_DAEMON",
                "method": "SHA256"
            }
        
        # TODO: Phase P6 - Implement actual Verus/Ed25519 signing here
        # For now, we simulate the structure
        simulated_sig = hashlib.sha256((payload_str + self.private_key).encode()).hexdigest()
        
        return {
            "manifest": manifest,
            "signature": simulated_sig,
            "signer": self.verus_id,
            "method": "VERUS_VDXF_V1"
        }

    def verify_manifest(self, signed_manifest: Dict[str, Any]) -> bool:
        """
        Verifies the integrity of a signed manifest.
        """
        manifest = signed_manifest.get("manifest")
        sig = signed_manifest.get("signature")
        method = signed_manifest.get("method")
        
        payload_str = json.dumps(manifest, sort_keys=True)
        
        if method == "SHA256":
             check = hashlib.sha256(payload_str.encode()).hexdigest()
             return check == sig
        
        if method == "VERUS_VDXF_V1":
             # Simulate verification
             if not self.enabled: return False
             check = hashlib.sha256((payload_str + self.private_key).encode()).hexdigest()
             return check == sig
             
        return False
