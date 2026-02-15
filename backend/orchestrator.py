
import asyncio
import json
import logging
from typing import List, Dict, Any, Callable
from .models import DAGTask, TaskStatus
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine

class ExecutiveOrchestrator:
    def __init__(self, router: ModelRouter, vault: VaultManager, ace: AffectiveEngine):
        self.router = router
        self.vault = vault
        self.ace = ace
        self.logger = logging.getLogger("Orchestrator")
        
        # Tool Registry: Maps string actions to executable methods
        self.tool_registry: Dict[str, Callable] = {
            "parse_intent": self._tool_parse_intent,
            "execute_core": self._tool_execute_core,
            "system_query": self._tool_system_query
        }

    async def execute_objective(self, objective: str, autonomy: str) -> str:
        self.logger.info(f"Received Objective: {objective} [Autonomy: {autonomy}]")
        
        # 1. Validation & Affective Check
        if self.ace.should_throttle():
             self.logger.warning("Affective state limits high-frequency execution.")
             if autonomy == "RESTRICTED":
                 return "[ HALTED ]: Biometric stress limit reached for restricted autonomy."
        
        # 2. Plan Generation
        # We use the router to parse the intent first
        intent_summary = await self._tool_parse_intent({"input": objective})
        self.logger.info(f"Parsed Intent: {intent_summary}")

        dag_plan = [
            DAGTask(id="task_intent", action="parse_intent", args={"input": objective}, status=TaskStatus.PENDING),
            DAGTask(id="task_exec", action="execute_core", args={"context": intent_summary, "autonomy": autonomy}, dependencies=["task_intent"], status=TaskStatus.PENDING)
        ]
        
        results = {}
        
        # 3. Execution Loop
        for task in dag_plan:
            self.logger.info(f"Starting Task: {task.id}")
            task.status = TaskStatus.RUNNING
            
            try:
                # Execute via Registry
                if task.action in self.tool_registry:
                    handler = self.tool_registry[task.action]
                    output = await handler(task.args)
                else:
                    raise ValueError(f"Unknown action: {task.action}")
                
                results[task.id] = output
                task.result = output
                task.status = TaskStatus.COMPLETED
                self.logger.info(f"Task {task.id} Completed.")
                
            except Exception as e:
                task.status = TaskStatus.FAILED
                self.logger.error(f"Task {task.id} Failed: {e}")
                results[task.id] = f"Error: {str(e)}"
                # Break chain on failure
                break
                
        return json.dumps(results)

    # --- Tool Implementations ---

    async def _tool_parse_intent(self, args: Dict[str, Any]) -> str:
        prompt = f"You are an autonomous executive. Parse the intent of the following objective and return a concise technical summary: {args.get('input', '')}"
        return await self.router.get_response(prompt, complexity="MEDIUM")

    async def _tool_execute_core(self, args: Dict[str, Any]) -> str:
        # Placeholder for core logic execution
        return f"Executed core logic for intent: {args.get('context', 'N/A')} with autonomy {args.get('autonomy', 'UNKNOWN')}"

    async def _tool_system_query(self, args: Dict[str, Any]) -> str:
        # Placeholder for system lookups
        return "system_nominal"
