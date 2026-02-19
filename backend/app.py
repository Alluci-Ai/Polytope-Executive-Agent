
import sys
import contextlib
import psutil
import logging
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from cryptography.fernet import Fernet
import uvicorn
import json

from .config import load_settings
from .models import ObjectiveRequest, TelemetryData, SystemStatus, LoginRequest, TaskItem, TaskUpdate, SoulPreferences, SoulManifest
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .security.auth import create_access_token, verify_authenticated
from .ace.engine import AffectiveEngine
from .tasks import TaskManager
from .skill_manager import SkillManager
from .database import create_db_and_tables
from .harmonic_enhancer import AttentionSignal

# 1. Config & Logging
settings = load_settings()
logger = logging.getLogger("PolytopeDaemon")

# Global Services
vault: VaultManager = None
router: ModelRouter = None
ace: AffectiveEngine = None
orchestrator: ExecutiveOrchestrator = None
task_manager: TaskManager = None
skill_manager: SkillManager = None

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global vault, router, ace, orchestrator, task_manager, skill_manager
    logger.info(f"[ BOOT ]: Polytope Daemon v4.5.1 ({settings.APP_ENV})")
    
    try:
        # Initialize Database
        create_db_and_tables()
        
        # Initialize Core Services
        vault = VaultManager(settings.POLYTOPE_MASTER_KEY)
        router = ModelRouter(settings)
        ace = AffectiveEngine()
        
        # Initialize Skills first (Orchestrator needs it)
        skill_manager = SkillManager(vault)
        task_manager = TaskManager()
        
        # Initialize Executive Engine (Planner/Executor/Critic)
        orchestrator = ExecutiveOrchestrator(router, vault, ace, settings, skill_manager=skill_manager)
        
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
    harmonic_state = "Active" if orchestrator and orchestrator.harmonic else "Initializing"
    if orchestrator and orchestrator.harmonic:
        if orchestrator.harmonic.current_state.in_stress_basin:
            harmonic_state = "Stress_Basin"
        elif orchestrator.harmonic.current_state.current_lattice.is_looping:
            harmonic_state = "Loop_Detected"
            
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL",
        "active_bridges": list(vault.get_active_vaults()) if vault else [],
        "vault_integrity": True,
        "daemon_version": "4.5.1",
        "harmonic_status": harmonic_state
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
    if not ace or not orchestrator: raise HTTPException(status_code=503)
    
    # 1. ACE Processing
    ace_res = ace.process_telemetry(data)
    
    # 2. Harmonic Enhancement
    if data.valence is not None:
        signal = AttentionSignal(
            valence=data.valence,
            arousal=data.arousal if data.arousal is not None else 0.5,
            focus=data.focus if data.focus is not None else 0.5
        )
        await orchestrator.harmonic.tick(signal)
        
    return {"status": "manifold_adjusted", "policy": ace_res}

# --- Task Routes (Privileged) ---
@app.get("/tasks", response_model=list[TaskItem], dependencies=[Depends(verify_authenticated)])
async def get_tasks(status: str = "all", priority: str = None, timeline: str = None):
    return task_manager.get_tasks(status=status, priority=priority, timeline=timeline)

@app.post("/tasks", response_model=TaskItem, dependencies=[Depends(verify_authenticated)])
async def add_task(task: TaskUpdate):
    return task_manager.add_task(task)

@app.put("/tasks/{index}", response_model=TaskItem, dependencies=[Depends(verify_authenticated)])
async def update_task(index: int, task: TaskUpdate):
    res = task_manager.update_task(index, task)
    if not res: raise HTTPException(status_code=404)
    return res

@app.delete("/tasks/{index}", dependencies=[Depends(verify_authenticated)])
async def delete_task(index: int):
    if not task_manager.delete_task(index): raise HTTPException(status_code=404)
    return {"status": "deleted"}

# --- Identity Forge (Soul Manifest) Routes ---

@app.get("/soul/manifest", response_model=SoulManifest, dependencies=[Depends(verify_authenticated)])
async def get_soul_manifest():
    if not vault: raise HTTPException(status_code=503)
    data = vault.retrieve_secret("soul_manifest")
    if not data:
        return SoulManifest(preferences=SoulPreferences())
    # Handle legacy format where only preferences existed
    if "preferences" not in data:
         return SoulManifest(preferences=SoulPreferences(**data))
    return SoulManifest(**data)

@app.post("/soul/manifest", dependencies=[Depends(verify_authenticated)])
async def update_soul_manifest(manifest: SoulManifest):
    if not vault: raise HTTPException(status_code=503)
    # Check ACE tether before allowing commit (Simple simulation)
    if ace and ace.should_throttle():
         logger.warning("Soul Manifest update blocked by ACE Throttle.")
         raise HTTPException(status_code=429, detail="Identity Forge Locked: Biometric Stress Detected. Calm down to proceed.")
         
    vault.store_secret("soul_manifest", manifest.dict())
    logger.info("Soul Manifest committed to Simplicial Vault.")
    return {"status": "calibrated", "hash": hash(str(manifest.dict()))}

@app.post("/soul/preview", dependencies=[Depends(verify_authenticated)])
async def preview_soul_manifest(manifest: SoulManifest, control_question: str = Body("Analysis of current status?", embed=True)):
    """Simulates the new personality with full cognitive context."""
    if not router: raise HTTPException(status_code=503)
    
    # Generate comprehensive system prompt for the simulator
    sys_prompt = f"""
    [ SYSTEM SIMULATION MODE ]
    
    # IDENTITY LAYER
    NAME: Alluci
    CORE: {manifest.identityCore}
    VOICE: {manifest.voiceProfile}
    DIRECTIVES: {', '.join(manifest.directives)}
    
    # COGNITION LAYER
    REASONING: {manifest.reasoningStyle}
    FRAMEWORKS: {', '.join(manifest.frameworks)}
    MINDSETS: {', '.join(manifest.mindsets)}
    METHODOLOGIES: {', '.join(manifest.methodologies)}
    CORE LOGIC: {', '.join(manifest.logic)}
    CHAINS OF THOUGHT: {', '.join(manifest.chainsOfThought)}
    BEST PRACTICES: {', '.join(manifest.bestPractices)}
    KNOWLEDGE_GRAPH: {', '.join(manifest.knowledgeGraph)}
    
    # PERSONALITY VECTORS
    - Tone: {manifest.preferences.tone}
    - Empathy: {manifest.preferences.empathy}
    - Humor: {manifest.preferences.humor}
    - Assertiveness: {manifest.preferences.assertiveness}
    - Creativity: {manifest.preferences.creativity}
    
    BOOT SEQUENCE: {manifest.bootSequence}
    
    INSTRUCTION: Respond to the user's input as if you were fully instantiated with these parameters.
    """
    
    response = await router.get_response(f"System Instruction: {sys_prompt}\n\nUser: {control_question}", complexity="LOW")
    return {"preview_response": response, "generated_prompt_snapshot": sys_prompt}

# --- Legacy Support for simple preferences ---
@app.get("/soul/preferences", response_model=SoulPreferences, dependencies=[Depends(verify_authenticated)])
async def get_soul_preferences():
    # Proxy to manifest
    m = await get_soul_manifest()
    return m.preferences

@app.post("/soul/preferences", dependencies=[Depends(verify_authenticated)])
async def update_soul_preferences(prefs: SoulPreferences):
    # Proxy to manifest update (fetch, patch, save)
    m = await get_soul_manifest()
    m.preferences = prefs
    return await update_soul_manifest(m)


# --- Skill Registry & Review Routes ---
@app.get("/skills", dependencies=[Depends(verify_authenticated)])
async def list_skills():
    if not skill_manager: raise HTTPException(status_code=503)
    return skill_manager.list_skills()

@app.post("/skills", dependencies=[Depends(verify_authenticated)])
async def create_skill(skill: Dict[str, Any]):
    if not skill_manager: raise HTTPException(status_code=503)
    return skill_manager.save_skill(skill)

@app.delete("/skills/{skill_id}", dependencies=[Depends(verify_authenticated)])
async def delete_skill(skill_id: str):
    if not skill_manager: raise HTTPException(status_code=503)
    if skill_manager.delete_skill(skill_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Skill not found")

@app.post("/skills/import", dependencies=[Depends(verify_authenticated)])
async def import_skill_package(package: Dict[str, Any]):
    """Imports a .polytype package into the Review Queue."""
    if not skill_manager: raise HTTPException(status_code=503)
    result = await skill_manager.import_package(package)
    return result

@app.get("/skills/review", dependencies=[Depends(verify_authenticated)])
async def get_review_queue():
    if not skill_manager: raise HTTPException(status_code=503)
    return skill_manager.get_review_queue()

@app.post("/skills/promote/{skill_id}", dependencies=[Depends(verify_authenticated)])
async def promote_skill(skill_id: str):
    if not skill_manager: raise HTTPException(status_code=503)
    if skill_manager.promote_from_queue(skill_id):
        return {"status": "promoted"}
    raise HTTPException(status_code=404, detail="Skill not in review queue")

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
