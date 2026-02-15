
import sys
import contextlib
import psutil
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from cryptography.fernet import Fernet
import uvicorn
import logging
from typing import List, Optional

from .config import load_settings, Settings
from .models import ObjectiveRequest, TelemetryData, SystemStatus, LoginRequest, TaskItem, TaskUpdate
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .security.auth import create_access_token, verify_authenticated
from .ace.engine import AffectiveEngine
from .tasks import TaskManager

# 1. Fail-Fast Configuration Loading
settings = load_settings()
logger = logging.getLogger("PolytopeDaemon")

# Global Service Instances
vault: VaultManager = None
router: ModelRouter = None
ace: AffectiveEngine = None
orchestrator: ExecutiveOrchestrator = None
task_manager: TaskManager = None

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global vault, router, ace, orchestrator, task_manager
    logger.info("[ BOOT ]: Initializing Polytope Sovereign Daemon...")
    
    # 2. Security Integrity Check
    try:
        # Validate Master Key format
        Fernet(settings.POLYTOPE_MASTER_KEY)
    except Exception:
        logger.critical("[ FATAL ]: POLYTOPE_MASTER_KEY is invalid.")
        sys.exit(1)

    # 3. Service Instantiation
    try:
        vault = VaultManager(settings.POLYTOPE_MASTER_KEY)
        router = ModelRouter(settings)
        ace = AffectiveEngine()
        orchestrator = ExecutiveOrchestrator(router, vault, ace, settings)
        task_manager = TaskManager()
        
        # 4. Start Background Services
        await orchestrator.start_background_services()
        
        logger.info("[ BOOT ]: System integrity verified. Manifold active.")
    except Exception as e:
        logger.critical(f"[ FATAL ]: Service instantiation failed: {e}")
        sys.exit(1)
        
    yield
    # 5. Cleanup
    await orchestrator.stop_background_services()
    logger.info("[ SHUTDOWN ]: Closing secure channels.")

app = FastAPI(
    title="Polytope Executive Daemon", 
    version="4.5.0",
    lifespan=lifespan
)

# 4. Strict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.post("/auth/login")
async def login(req: LoginRequest):
    """
    Exchanges the Sovereign Master Key for a JWT Access Token.
    """
    if req.key != settings.POLYTOPE_MASTER_KEY:
         raise HTTPException(status_code=401, detail="Invalid Sovereign Key")
    token = create_access_token(data={"sub": "sovereign_admin"})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    """
    Public status endpoint for heartbeat checks.
    """
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
    """
    Protected endpoint: Executes a sovereign objective.
    Requires valid JWT in Authorization header.
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="System initializing")
    try:
        # Pass autonomy level to orchestrator
        result = await orchestrator.execute_objective(req.objective, req.autonomy_level)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Objective failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/telemetry/ingest", dependencies=[Depends(verify_authenticated)])
async def ingest_telemetry(data: TelemetryData):
    """
    Protected endpoint: Ingests biometric data.
    Requires valid JWT in Authorization header.
    """
    if not ace:
         raise HTTPException(status_code=503, detail="ACE Engine not ready")
    adjustment = ace.process_telemetry(data)
    return {"status": "manifold_adjusted", "policy": adjustment}

# --- Task Management Endpoints ---

@app.get("/tasks", response_model=List[TaskItem])
async def get_tasks(
    status: str = Query("all", enum=["all", "active", "completed"]),
    priority: Optional[str] = Query(None),
    timeline: Optional[str] = Query(None, enum=["ALL", "TODAY", "WEEK", "OVERDUE"])
):
    return task_manager.get_tasks(status=status, priority=priority, timeline=timeline)

@app.post("/tasks", response_model=TaskItem)
async def add_task(task: TaskUpdate):
    if task.due_date:
        try:
            datetime.strptime(task.due_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (YYYY-MM-DD required)")
            
    return task_manager.add_task(task)

@app.put("/tasks/{index}", response_model=TaskItem)
async def update_task(index: int, task: TaskUpdate):
    if task.due_date:
        try:
            datetime.strptime(task.due_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (YYYY-MM-DD required)")

    try:
        result = task_manager.update_task(index, task)
        if not result:
             raise HTTPException(status_code=404, detail="Task not found or invalid index")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/tasks/{index}")
async def delete_task(index: int):
    success = task_manager.delete_task(index)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
