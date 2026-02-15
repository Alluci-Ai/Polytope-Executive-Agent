
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
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PolytopeDaemon")

# Load Configuration
MASTER_KEY = os.getenv("POLYTOPE_MASTER_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")

# Global Service Instances
vault = None
router = None
ace = None
orchestrator = None

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global vault, router, ace, orchestrator
    logger.info("[ BOOT ]: Initializing Polytope Sovereign Daemon...")
    
    # 1. Security Validation
    if not MASTER_KEY:
        logger.warning("[ SECURITY ]: POLYTOPE_MASTER_KEY missing. Generating ephemeral key for session.")
        # Generates a key for local development ease, ensuring app starts but isn't secure for prod persistence
        ephemeral_key = Fernet.generate_key()
        logger.warning(f"[ SECURITY ]: Using Ephemeral Master Key: {ephemeral_key.decode()}")
        final_master_key = ephemeral_key
    else:
        final_master_key = MASTER_KEY

    # 2. Service Instantiation
    try:
        vault = VaultManager(final_master_key)
        router = ModelRouter()
        ace = AffectiveEngine()
        orchestrator = ExecutiveOrchestrator(router, vault, ace)
        logger.info("[ BOOT ]: Services instantiated successfully.")
    except Exception as e:
        logger.critical(f"[ FATAL ]: Service instantiation failed: {e}")
        sys.exit(1)
        
    yield
    logger.info("[ SHUTDOWN ]: Closing secure channels.")

app = FastAPI(
    title="Polytope Executive Daemon", 
    version="4.5.0",
    lifespan=lifespan
)

# CORS Configuration - Locked to local development origins
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL",
        "active_bridges": list(vault.get_active_vaults()) if vault else [],
        "vault_integrity": True
    }

@app.post("/objective/execute")
async def execute_objective(req: ObjectiveRequest):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="System not initialized")
    try:
        # Pass autonomy level to orchestrator
        result = await orchestrator.execute_objective(req.objective, req.autonomy_level)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Objective failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/telemetry/ingest")
async def ingest_telemetry(data: TelemetryData):
    if not ace:
        raise HTTPException(status_code=503, detail="ACE not initialized")
    adjustment = ace.process_telemetry(data)
    return {"status": "manifold_adjusted", "policy": adjustment}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
