import sys
import contextlib
import psutil
import logging
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from cryptography.fernet import Fernet
import uvicorn

from .config import load_settings
from .models import ObjectiveRequest, TelemetryData, SystemStatus, LoginRequest, TaskItem, TaskUpdate
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .security.auth import create_access_token, verify_authenticated
from .ace.engine import AffectiveEngine
from .tasks import TaskManager

# 1. Config & Logging
settings = load_settings()
logger = logging.getLogger("PolytopeDaemon")

# Global Services
vault: VaultManager = None
router: ModelRouter = None
ace: AffectiveEngine = None
orchestrator: ExecutiveOrchestrator = None
task_manager: TaskManager = None

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global vault, router, ace, orchestrator, task_manager
    logger.info(f"[ BOOT ]: Polytope Daemon v4.5.1 ({settings.APP_ENV})")
    
    try:
        # Initialize Core Services
        vault = VaultManager(settings.POLYTOPE_MASTER_KEY)
        router = ModelRouter(settings)
        ace = AffectiveEngine()
        
        # Initialize Executive Engine (Planner/Executor/Critic)
        orchestrator = ExecutiveOrchestrator(router, vault, ace, settings)
        
        task_manager = TaskManager()
        
        await orchestrator.start_background_services()
        logger.info("✅ System Integrity Verified. Manifold Active.")
    except Exception as e:
        logger.critical(f"❌ Startup Failed: {e}")
        sys.exit(1)
        
    yield
    
    await orchestrator.stop_background_services()
    logger.info("💤 Daemon Shutdown Complete.")

app = FastAPI(title="Polytope Executive Daemon", version="4.5.1", lifespan=lifespan)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/login")
async def login(req: LoginRequest):
    if req.key != settings.POLYTOPE_MASTER_KEY:
         raise HTTPException(status_code=401, detail="Invalid Sovereign Key")
    token = create_access_token(data={"sub": "sovereign_admin"})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL",
        "active_bridges": list(vault.get_active_vaults()) if vault else [],
        "vault_integrity": True,
        "daemon_version": "4.5.1"
    }

@app.post("/objective/execute", dependencies=[Depends(verify_authenticated)])
async def execute_objective(req: ObjectiveRequest):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="System initializing")
    try:
        return await orchestrator.execute_objective(req.objective, req.autonomy_level)
    except Exception as e:
        logger.error(f"Execution Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/telemetry/ingest", dependencies=[Depends(verify_authenticated)])
async def ingest_telemetry(data: TelemetryData):
    if not ace: raise HTTPException(status_code=503)
    return {"status": "manifold_adjusted", "policy": ace.process_telemetry(data)}

# --- Task Routes ---
@app.get("/tasks", response_model=list[TaskItem])
async def get_tasks(status: str = "all", priority: str = None, timeline: str = None):
    return task_manager.get_tasks(status=status, priority=priority, timeline=timeline)

@app.post("/tasks", response_model=TaskItem)
async def add_task(task: TaskUpdate):
    return task_manager.add_task(task)

@app.put("/tasks/{index}", response_model=TaskItem)
async def update_task(index: int, task: TaskUpdate):
    res = task_manager.update_task(index, task)
    if not res: raise HTTPException(status_code=404)
    return res

@app.delete("/tasks/{index}")
async def delete_task(index: int):
    if not task_manager.delete_task(index): raise HTTPException(status_code=404)
    return {"status": "deleted"}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
