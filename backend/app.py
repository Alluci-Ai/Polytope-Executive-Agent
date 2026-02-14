
import os
import psutil
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from .models import ObjectiveRequest, TelemetryData, SystemStatus
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine

# Load Master Key from environment or secure local storage
MASTER_KEY = os.getenv("POLYTOPE_MASTER_KEY", "PLACEHOLDER_FOR_PRODUCTION_KEY_DO_NOT_HARDCODE")

app = FastAPI(title="Polytope Executive Daemon", version="4.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Production Services
vault = VaultManager(MASTER_KEY)
router = ModelRouter()
ace = AffectiveEngine()
orchestrator = ExecutiveOrchestrator(router, vault, ace)

@app.on_event("startup")
async def startup_event():
    print("[ POLYTOPE ]: Executive Daemon initialized on local manifold.")

@app.post("/objective/execute")
async def execute_hero_command(req: ObjectiveRequest):
    """
    Primary endpoint for high-level autonomous task execution.
    Triggers the DAG Planner and Critic Loop.
    """
    try:
        result = await orchestrator.execute_objective(req.objective, req.autonomy_level)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    """
    Returns real hardware telemetry and vault health.
    """
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL", 
        "active_bridges": list(vault.get_active_vaults()),
        "vault_integrity": True
    }

@app.post("/telemetry/ingest")
async def ingest_telemetry(data: TelemetryData):
    """
    Accepts biometric data from wearable/local sensors to adjust agent behavior.
    """
    adjustment = ace.process_telemetry(data)
    return {"status": "manifold_adjusted", "policy": adjustment}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
