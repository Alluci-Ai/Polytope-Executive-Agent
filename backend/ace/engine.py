
from ..models import TelemetryData
from typing import Dict, Any

class AffectiveEngine:
    """
    Monitors user's biological state and adjusts agent autonomy levels.
    """
    def __init__(self):
        self.current_state = {
            "stress_score": 0.0,
            "focus_level": 1.0,
            "is_throttled": False
        }

    def process_telemetry(self, data: TelemetryData) -> Dict[str, Any]:
        # Simple heuristic: high HR and low HRV indicates stress
        if data.hr and data.hrv:
            stress = (data.hr / data.hrv) * 10 
            self.current_state["stress_score"] = stress
            
            # If stressed, enable "Low Interruption" mode
            if stress > 70:
                self.current_state["is_throttled"] = True
                return {"mode": "LOW_INTERRUPTION", "reason": "Biometric_Stress_Detected"}
        
        self.current_state["is_throttled"] = False
        return {"mode": "STANDARD", "reason": "Nominal_State"}

    def should_throttle(self) -> bool:
        return self.current_state["is_throttled"]
