
import os
import sys
import logging
import contextlib
import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from cryptography.fernet import Fernet
import uvicorn

from .models import ObjectiveRequest, TelemetryData, SystemStatus
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PolytopeDaemon")

# 1. Fail-Fast Configuration Loading
MASTER_KEY = os.getenv("POLYTOPE_MASTER_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Validation
    logger.info("[ BOOT ]: Initializing Polytope Sovereign Daemon...")
    
    # Validation 1: Master Key Integrity
    if not MASTER_KEY:
        logger.critical("[ FATAL ]: POLYTOPE_MASTER_KEY is missing. Aborting startup.")
        sys.exit(1)
    try:
        Fernet(MASTER_KEY)
    except Exception:
        logger.critical("[ FATAL ]: POLYTOPE_MASTER_KEY is not a valid Fernet key.")
        sys.exit(1)
        
    # Validation 2: Provider Keys
    if not GEMINI_API_KEY:
        logger.warning("[ WARN ]: GEMINI_API_KEY missing. Inference capabilities restricted.")
    
    logger.info("[ BOOT ]: System integrity verified. Manifold active.")
    yield
    # Shutdown logic if needed
    logger.info("[ SHUTDOWN ]: Closing secure channels.")

app = FastAPI(
    title="Polytope Executive Daemon", 
    version="4.4.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service Instantiation
try:
    vault = VaultManager(MASTER_KEY)
    router = ModelRouter()
    ace = AffectiveEngine()
    orchestrator = ExecutiveOrchestrator(router, vault, ace)
except Exception as e:
    logger.critical(f"[ FATAL ]: Service instantiation failed: {e}")
    sys.exit(1)

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL",
        "active_bridges": list(vault.get_active_vaults()),
        "vault_integrity": True
    }

@app.post("/objective/execute")
async def execute_objective(req: ObjectiveRequest):
    try:
        # Pass autonomy level to orchestrator
        result = await orchestrator.execute_objective(req.objective, req.autonomy_level)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Objective failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/telemetry/ingest")
async def ingest_telemetry(data: TelemetryData):
    adjustment = ace.process_telemetry(data)
    return {"status": "manifold_adjusted", "policy": adjustment}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
