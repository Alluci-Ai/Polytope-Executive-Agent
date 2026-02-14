
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class DAGTask(BaseModel):
    id: str
    action: str
    args: Dict[str, Any]
    dependencies: List[str] = []
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None

class ObjectiveRequest(BaseModel):
    objective: str
    autonomy_level: str = "SEMI_AUTONOMOUS"

class TelemetryData(BaseModel):
    hr: Optional[int] = None
    hrv: Optional[int] = None
    stress_score: Optional[float] = None
    energy_level: Optional[float] = None

class SystemStatus(BaseModel):
    cpu_usage: float
    ram_usage: float
    thermal_status: str
    active_bridges: List[str]
    vault_integrity: bool
