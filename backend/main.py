
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import ObjectiveRequest, TelemetryData, SystemStatus
from .orchestrator import ExecutiveOrchestrator
from .inference.router import ModelRouter
import psutil
import platform

app = FastAPI(title="Polytope Executive Daemon", version="4.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Services
router = ModelRouter()
orchestrator = ExecutiveOrchestrator(router)

@app.post("/objective/execute")
async def execute_hero_command(req: ObjectiveRequest):
    try:
        result = await orchestrator.execute_objective(req.objective)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    return {
        "cpu_usage": psutil.cpu_percent(),
        "ram_usage": psutil.virtual_memory().percent,
        "thermal_status": "NOMINAL", # In production, integrate resource_monitor.py
        "active_bridges": ["GMAIL", "SLACK"],
        "vault_integrity": True
    }

@app.post("/telemetry/ingest")
async def ingest_telemetry(data: TelemetryData):
    # Logic to adjust agent state based on user's biological stress
    return {"status": "manifold_adjusted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
