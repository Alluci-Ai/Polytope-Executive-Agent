
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CRITIQUED_RETRY = "critiqued_retry"

class PlanStep(BaseModel):
    id: str
    description: str
    tool: str
    dependencies: List[str] = []

class ExecutionPlan(BaseModel):
    objective: str
    steps: List[PlanStep]

class DAGTask(BaseModel):
    id: str
    action: str
    args: Dict[str, Any]
    dependencies: List[str] = []
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    retry_count: int = 0
    logs: List[str] = []

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
    daemon_version: str = "4.5.1"

class CriticResult(BaseModel):
    score: float  # 0.0 to 1.0
    feedback: str
    passed: bool

class LoginRequest(BaseModel):
    key: str

class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class TaskItem(BaseModel):
    index: int
    raw_line: str
    description: str
    completed: bool
    priority: TaskPriority
    due_date: Optional[str] = None # YYYY-MM-DD

class TaskUpdate(BaseModel):
    description: str
    completed: bool
    priority: TaskPriority
    due_date: Optional[str] = None
