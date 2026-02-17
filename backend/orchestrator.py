import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Callable
from sqlmodel import Session

from .models import TaskStatus, Run, RunStatus
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine
from .config import Settings
from .security.verus import SovereignIdentity
from .database import engine as db_engine

# Engine Modules
from .engine.planner import Planner
from .engine.executor import Executor
from .engine.critic import Critic
from .adapters.registry import AdapterRegistry
from .harmonic_enhancer import HarmonicAssistant

class ExecutiveOrchestrator:
    def __init__(self, router: ModelRouter, vault: VaultManager, ace: AffectiveEngine, settings: Settings):
        self.settings = settings
        self.logger = logging.getLogger("Orchestrator")
        
        # Sub-systems
        self.identity = SovereignIdentity(settings)
        self.planner = Planner(router)
        self.critic = Critic(router, settings.CRITIC_THRESHOLD)
        self.adapter_registry = AdapterRegistry()
        self.harmonic = HarmonicAssistant() # Harmonic Enhancer Integration
        self.ace = ace
        
        # Pass a callable that returns the engine binding or creates a session
        # For simplicity with SQLModel, we can pass the engine and let Executor handle session creation
        self.executor = Executor(
            self.adapter_registry, 
            session_factory=lambda: db_engine,
            max_concurrent=settings.MAX_CONCURRENT_TASKS
        )

    async def start_background_services(self):
        self.logger.info("Background services started.")

    async def stop_background_services(self):
        self.logger.info("Background services stopped.")

    async def execute_objective(self, objective: str, autonomy: str) -> Dict[str, Any]:
        self.logger.info(f"🚀 EXECUTING SOVEREIGN OBJECTIVE: {objective}")

        # 1. Create DB Run Record
        run_id = self._create_run_record(objective, autonomy)

        # 2. Affective Gate
        if autonomy == "RESTRICTED" and self.ace.should_throttle():
             self._update_run_status(run_id, RunStatus.FAILED, feedback="Biometric Throttle")
             return {"status": "halted", "reason": "Biometric stress limit reached."}

        # 3. Planning
        try:
            tasks = await self.planner.generate_plan(objective)
            
            # --- Harmonic Ranking Hook ---
            # Prioritize tasks based on Topological and Lattice dynamics
            task_list = list(tasks.values())
            ranked_list = self.harmonic.rank_actions(task_list)
            
            # Log the ranking for observability
            self.logger.info(f"Harmonic Ranking Applied: {[t.id for t in ranked_list]}")
            
            current_plan = [t.dict() for t in ranked_list]
            self._update_run_status(run_id, RunStatus.ACTIVE)
        except Exception as e:
            self._update_run_status(run_id, RunStatus.FAILED, feedback=str(e))
            return {"status": "failed", "reason": f"Planning failed: {str(e)}"}

        # 4. Sovereign Signing (Phase P6)
        signed_manifest = self.identity.sign_manifest({
            "objective": objective,
            "plan_hash": hash(str(current_plan)),
            "timestamp": asyncio.get_event_loop().time()
        })
        self._save_manifest(run_id, signed_manifest.get("signature"))
        self.logger.info(f"📜 Manifest Signed by {signed_manifest['signer']}")

        # 5. Execution Loop
        final_output = ""
        critic_score = 0.0
        
        for attempt in range(self.settings.MAX_AUTONOMY_RETRIES):
            self.logger.info(f"--- 🔄 Cycle {attempt + 1} ---")
            
            # Execute
            updated_tasks = await self.executor.execute_dag(run_id, tasks)
            
            # Check Results
            failed_tasks = [t.id for t in updated_tasks.values() if t.status == TaskStatus.FAILED]
            results_summary = json.dumps({t.id: t.result for t in updated_tasks.values()}, indent=2)
            
            # Critique
            passed, score, feedback = await self.critic.evaluate(objective, results_summary)
            
            if passed and not failed_tasks:
                self._update_run_status(run_id, RunStatus.COMPLETED, score=score, feedback=feedback)
                return {
                    "run_id": run_id,
                    "status": "success",
                    "result": results_summary,
                    "score": score,
                    "manifest": signed_manifest
                }
            
            # Self-Correction
            if attempt < self.settings.MAX_AUTONOMY_RETRIES - 1:
                try:
                    tasks = await self.planner.refine_plan(
                        objective, current_plan, results_summary, feedback, failed_tasks
                    )
                    current_plan = [t.dict() for t in tasks.values()]
                except Exception as e:
                    self.logger.error(f"Refinement failed: {e}")
                    break
        
        self._update_run_status(run_id, RunStatus.FAILED, score=critic_score, feedback=feedback)
        return {
            "run_id": run_id,
            "status": "failed",
            "reason": "Max retries exceeded",
            "score": critic_score,
            "feedback": feedback
        }

    # --- Persistence Methods ---
    def _create_run_record(self, objective: str, autonomy: str) -> int:
        with Session(db_engine) as session:
            run = Run(objective=objective, autonomy_level=autonomy, status=RunStatus.QUEUED)
            session.add(run)
            session.commit()
            session.refresh(run)
            return run.id

    def _update_run_status(self, run_id: int, status: str, score: float = 0.0, feedback: str = None):
        with Session(db_engine) as session:
            run = session.get(Run, run_id)
            if run:
                run.status = status
                if status in [RunStatus.COMPLETED, RunStatus.FAILED]:
                    run.completed_at = datetime.utcnow()
                if score: run.score = score
                if feedback: run.feedback = feedback
                session.add(run)
                session.commit()

    def _save_manifest(self, run_id: int, signature: str):
        with Session(db_engine) as session:
            run = session.get(Run, run_id)
            if run:
                run.manifest_signature = signature
                session.add(run)
                session.commit()