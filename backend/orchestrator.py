import asyncio
import json
import logging
from typing import Dict, Any, Callable
from .models import TaskStatus
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine
from .config import Settings
from .security.verus import SovereignIdentity

# Engine Modules
from .engine.planner import Planner
from .engine.executor import Executor
from .engine.critic import Critic

class ExecutiveOrchestrator:
    def __init__(self, router: ModelRouter, vault: VaultManager, ace: AffectiveEngine, settings: Settings):
        self.settings = settings
        self.logger = logging.getLogger("Orchestrator")
        
        # Sub-systems
        self.identity = SovereignIdentity(settings)
        self.planner = Planner(router)
        self.critic = Critic(router, settings.CRITIC_THRESHOLD)
        
        # Tools Registry
        self.tool_registry: Dict[str, Callable] = {
            "web_search": self._tool_web_search,
            "summarize": self._tool_summarize,
            "analyze_data": self._tool_analyze,
            "system_query": self._tool_system_query
        }
        
        self.executor = Executor(self.tool_registry, settings.MAX_CONCURRENT_TASKS)

    async def start_background_services(self):
        self.logger.info("Background services started.")

    async def stop_background_services(self):
        self.logger.info("Background services stopped.")

    async def execute_objective(self, objective: str, autonomy: str) -> Dict[str, Any]:
        self.logger.info(f"🚀 EXECUTING SOVEREIGN OBJECTIVE: {objective}")

        # 1. Affective Gate
        if autonomy == "RESTRICTED" and self.ace.should_throttle():
             return {"status": "halted", "reason": "Biometric stress limit reached."}

        # 2. Planning (Phase P1)
        try:
            tasks = await self.planner.generate_plan(objective)
            current_plan = [t.dict() for t in tasks.values()]
        except Exception as e:
            return {"status": "failed", "reason": f"Planning failed: {str(e)}"}

        # 3. Sovereign Signing (Phase P6)
        signed_manifest = self.identity.sign_manifest({
            "objective": objective,
            "plan_hash": hash(str(current_plan)),
            "timestamp": asyncio.get_event_loop().time()
        })
        self.logger.info(f"📜 Manifest Signed by {signed_manifest['signer']}")

        # 4. Execution Loop
        final_output = ""
        critic_score = 0.0
        
        for attempt in range(self.settings.MAX_AUTONOMY_RETRIES):
            self.logger.info(f"--- 🔄 Cycle {attempt + 1} ---")
            
            # Execute
            updated_tasks = await self.executor.execute_dag(tasks)
            
            # Check Results
            failed_tasks = [t.id for t in updated_tasks.values() if t.status == TaskStatus.FAILED]
            results_summary = json.dumps({t.id: t.result for t in updated_tasks.values()}, indent=2)
            
            # Critique
            passed, score, feedback = await self.critic.evaluate(objective, results_summary)
            
            if passed and not failed_tasks:
                return {
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
        
        return {
            "status": "failed",
            "reason": "Max retries exceeded",
            "score": critic_score,
            "feedback": feedback
        }

    # --- Tool Implementations ---
    async def _tool_web_search(self, args: Dict[str, Any]) -> str:
        return f"[ SEARCH ]: Simulated results for '{args.get('description')}'"

    async def _tool_summarize(self, args: Dict[str, Any]) -> str:
        return "[ SUMMARIZE ]: Data condensed successfully."

    async def _tool_analyze(self, args: Dict[str, Any]) -> str:
        return "[ ANALYZE ]: Patterns detected within nominal variance."

    async def _tool_system_query(self, args: Dict[str, Any]) -> str:
        return "[ SYSTEM ]: All systems nominal."
