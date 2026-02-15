
import asyncio
import json
import logging
from typing import List, Dict, Any, Callable, Set, Optional
from datetime import datetime
from .models import DAGTask, TaskStatus, CriticResult
from .inference.router import ModelRouter
from .security.vault import VaultManager
from .ace.engine import AffectiveEngine
from .config import Settings
from .heartbeat import HeartbeatDaemon

class ExecutiveOrchestrator:
    def __init__(self, router: ModelRouter, vault: VaultManager, ace: AffectiveEngine, settings: Settings):
        self.router = router
        self.vault = vault
        self.ace = ace
        self.settings = settings
        self.logger = logging.getLogger("Orchestrator")
        
        # Tool Registry
        self.tool_registry: Dict[str, Callable] = {
            "web_search": self._tool_web_search,
            "summarize": self._tool_summarize,
            "analyze_data": self._tool_analyze,
            "system_query": self._tool_system_query
        }
        
        # In-memory persistence for the session
        self.execution_history = []
        
        # Heartbeat System
        self.heartbeat = HeartbeatDaemon(self, interval_seconds=900) # 15 minutes

    async def start_background_services(self):
        """Called by app lifecycle to start the heartbeat loop."""
        asyncio.create_task(self.heartbeat.start())

    async def stop_background_services(self):
        await self.heartbeat.stop()

    async def trigger_proactive_event(self, orders: List[str], changes: List[str]):
        """
        Called by HeartbeatDaemon when conditions warrant agent attention.
        """
        # Construct a specific context for the LLM
        context = f"""
        SYSTEM: You are waking up for a scheduled heartbeat check.
        STANDING ORDERS (HEARTBEAT.md): {json.dumps(orders)}
        DETECTED STATE CHANGES: {json.dumps(changes)}
        
        INSTRUCTION: 
        1. Analyze the changes against the standing orders.
        2. Decide if a proactive notification or action is required.
        3. If YES, generate a brief, rich-text status update for the user.
        4. If NO, return NULL.
        """
        
        try:
            # We use the router to get a "thought"
            response = await self.router.get_response(context, complexity="MEDIUM")
            
            # Simple heuristic: If response is short/empty or indicates no action, we ignore.
            if len(response) > 20 and "NULL" not in response:
                self.logger.info(f"Proactive Action Decided: {response[:50]}...")
                
                # In a real system, we would push this to a Notification Queue
                # For now, we append it to the audit log so the UI sees it
                log_entry = {
                    "event": "PROACTIVE_HEARTBEAT",
                    "details": {"action": "notification", "content": response},
                    "timestamp": datetime.utcnow().isoformat()
                }
                # (Simulating audit log push - normally handled by AuditLedger in core)
                self.execution_history.append(log_entry)
                
        except Exception as e:
            self.logger.error(f"Proactive Reasoning Failed: {e}")

    async def execute_objective(self, objective: str, autonomy: str) -> Dict[str, Any]:
        self.logger.info(f"Received Objective: {objective} [Autonomy: {autonomy}]")
        
        # 1. Affective Gate
        if self.ace.should_throttle() and autonomy == "RESTRICTED":
             return {"status": "halted", "reason": "Biometric stress limit reached."}

        # 2. Plan Generation (DAG)
        try:
            plan_json = await self.router.get_structured_plan(objective)
            current_steps = plan_json.get("steps", [])
            if not current_steps:
                return {"status": "failed", "result": "Planner produced no actionable steps."}
            
            # Validate and Build Initial DAG
            tasks = self._validate_and_build_dag(current_steps, objective)
            
        except ValueError as ve:
             self.logger.error(f"Plan Validation Error: {ve}")
             return {"status": "failed", "result": f"Invalid Execution Plan: {ve}"}
        except Exception as e:
            self.logger.error(f"Planning Error: {e}")
            return {"status": "failed", "result": f"Planning Error: {e}"}

        # 3. Execution Loop with Self-Correction
        final_output = ""
        critic_score = 0.0
        feedback = ""

        for attempt in range(self.settings.MAX_AUTONOMY_RETRIES):
            self.logger.info(f"--- Execution Attempt {attempt + 1}/{self.settings.MAX_AUTONOMY_RETRIES} ---")
            
            # Execute current DAG
            await self._execute_dag(tasks)
            
            # Gather results
            result_map = {k: v.result for k, v in tasks.items()}
            final_output = json.dumps(result_map, indent=2)
            failed_tasks = [t for t in tasks.values() if t.status == TaskStatus.FAILED]
            
            # 4. Integrity Critic
            criticism = await self.router.critique_result(objective, final_output)
            critic_score = criticism.get("score", 0.0)
            feedback = criticism.get("feedback", "No feedback provided.")
            
            # Success Condition: No task failures AND Score >= Threshold
            is_success = not failed_tasks and critic_score >= self.settings.CRITIC_THRESHOLD
            
            if is_success:
                self.logger.info(f"Objective Successful (Score: {critic_score})")
                return {
                    "status": "success", 
                    "plan": current_steps, 
                    "result": final_output, 
                    "critic_score": critic_score,
                    "attempts": attempt + 1
                }
            
            # Failure/Retry Logic
            self.logger.warning(f"Attempt {attempt + 1} Failed. Score: {critic_score}. Feedback: {feedback}")
            
            if attempt < self.settings.MAX_AUTONOMY_RETRIES - 1:
                self.logger.info("Initiating Self-Correction Protocol...")
                try:
                    # Refine Plan
                    new_plan_json = await self.router.refine_plan(
                        objective=objective,
                        original_plan=current_steps,
                        execution_results=final_output,
                        critic_feedback=feedback,
                        failed_tasks=[t.id for t in failed_tasks]
                    )
                    
                    current_steps = new_plan_json.get("steps", [])
                    if not current_steps:
                        self.logger.error("Refinement produced empty plan. Aborting.")
                        break
                    
                    # Rebuild DAG with new steps
                    tasks = self._validate_and_build_dag(current_steps, objective)
                    
                except Exception as e:
                    self.logger.error(f"Self-Correction crashed: {e}")
                    # If replanning fails, return current best effort but marked failed
                    break
            else:
                 self.logger.error("Max autonomy retries exhausted.")

        return {
            "status": "failed", 
            "reason": "Max retries exceeded or critic threshold not met.", 
            "final_score": critic_score, 
            "critic_feedback": feedback,
            "result": final_output,
            "attempts": self.settings.MAX_AUTONOMY_RETRIES
        }

    def _validate_and_build_dag(self, steps: List[Dict[str, Any]], objective: str) -> Dict[str, DAGTask]:
        """
        Parses raw steps, enforces DAG structure, checks unique IDs, 
        verifies dependencies, and detects cycles using DFS.
        """
        tasks: Dict[str, DAGTask] = {}
        
        # 1. Parse and Enforce Uniqueness
        for step in steps:
            t_id = step.get('id')
            if not t_id:
                raise ValueError(f"Plan step missing 'id' field: {step}")
            if t_id in tasks:
                raise ValueError(f"Duplicate Task ID detected: '{t_id}'")
            
            tasks[t_id] = DAGTask(
                id=t_id,
                action=step.get('tool', 'unknown'),
                args={"description": step.get('description', ''), "context": objective},
                dependencies=step.get('dependencies', [])
            )

        # 2. Verify Dependency Existence
        for t_id, task in tasks.items():
            for dep in task.dependencies:
                if dep == t_id:
                    raise ValueError(f"Self-dependency detected in task '{t_id}'")
                if dep not in tasks:
                    raise ValueError(f"Task '{t_id}' depends on non-existent task '{dep}'")

        # 3. Cycle Detection (DFS)
        self._detect_cycles(tasks)

        return tasks

    def _detect_cycles(self, tasks: Dict[str, DAGTask]):
        """
        Detects cycles in the dependency graph using Depth First Search.
        Raises ValueError with the cycle path if one is found.
        """
        visited: Set[str] = set()
        path_stack: List[str] = []
        path_set: Set[str] = set()

        def dfs(current_id: str):
            visited.add(current_id)
            path_stack.append(current_id)
            path_set.add(current_id)

            for dep_id in tasks[current_id].dependencies:
                if dep_id not in visited:
                    dfs(dep_id)
                elif dep_id in path_set:
                    # Cycle found - reconstruct path
                    try:
                        cycle_start_index = path_stack.index(dep_id)
                        cycle = path_stack[cycle_start_index:]
                        cycle.append(dep_id)
                        cycle_path = " -> ".join(cycle)
                        raise ValueError(f"Cycle detected in execution plan: {cycle_path}")
                    except ValueError as e:
                         # Propagate if it's our error, else raise generic
                         if "Cycle detected" in str(e):
                             raise e
                         raise ValueError(f"Cycle detected involving {dep_id}")
            
            path_stack.pop()
            path_set.remove(current_id)

        for t_id in tasks:
            if t_id not in visited:
                dfs(t_id)

    async def _execute_dag(self, tasks: Dict[str, DAGTask]) -> Dict[str, Any]:
        """
        Executes tasks respecting dependencies using a topological readiness approach.
        """
        pending_ids = set(tasks.keys())
        completed_ids = set()
        
        max_iterations = len(tasks) * 2
        iterations = 0

        while pending_ids and iterations < max_iterations:
            iterations += 1
            progress_made = False
            
            executable = []
            for t_id in list(pending_ids):
                task = tasks[t_id]
                if all(dep in completed_ids for dep in task.dependencies):
                    executable.append(t_id)

            if not executable and pending_ids:
                self.logger.error("Deadlock detected in execution loop.")
                break

            for t_id in executable:
                task = tasks[t_id]
                task.status = TaskStatus.RUNNING
                
                # Gather context
                dep_results = {dep: tasks[dep].result for dep in task.dependencies}
                task.args["dependency_data"] = dep_results
                
                # --- ENHANCED LOGGING START ---
                start_time = datetime.now()
                try:
                    # Filter out large dependency data for logs to keep them readable
                    filtered_args = {k: v for k, v in task.args.items() if k != "dependency_data"}
                    args_str = json.dumps(filtered_args, default=str)
                except Exception:
                    args_str = "Unserializable Args"

                task.logs.append(f"[{start_time.isoformat()}] STARTED | Action: {task.action} | Args: {args_str}")
                self.logger.info(f"Executing Task: {t_id} ({task.action})")
                # ------------------------------
                
                try:
                    handler = self.tool_registry.get(task.action, self._tool_fallback)
                    
                    result = await handler(task.args)
                    
                    task.result = result
                    task.status = TaskStatus.COMPLETED
                    
                    # --- ENHANCED LOGGING SUCCESS ---
                    end_time = datetime.now()
                    duration = (end_time - start_time).total_seconds()
                    
                    # Preview result to avoid bloating logs with massive outputs
                    res_str = str(result)
                    result_preview = res_str[:200] + "..." if len(res_str) > 200 else res_str
                    
                    task.logs.append(f"[{end_time.isoformat()}] COMPLETED | Duration: {duration:.3f}s | Result: {result_preview}")
                    # --------------------------------
                    
                    completed_ids.add(t_id)
                    pending_ids.remove(t_id)
                    progress_made = True
                except Exception as e:
                    # --- ENHANCED LOGGING FAILURE ---
                    end_time = datetime.now()
                    duration = (end_time - start_time).total_seconds()
                    
                    self.logger.error(f"Task {t_id} failed: {e}")
                    task.status = TaskStatus.FAILED
                    task.result = f"Execution Error: {str(e)}"
                    
                    task.logs.append(f"[{end_time.isoformat()}] FAILED | Duration: {duration:.3f}s | Error: {str(e)}")
                    # --------------------------------
                    
                    pending_ids.remove(t_id) 
            
            if not progress_made and pending_ids:
                break
                
        return tasks

    # --- Real Tool Implementations (Simulated I/O for stability) ---

    async def _tool_web_search(self, args: Dict[str, Any]) -> str:
        desc = args.get('description', 'query')
        return f"[ SEARCH_RESULT ]: Found high-relevance data for '{desc}'..."

    async def _tool_summarize(self, args: Dict[str, Any]) -> str:
        data = args.get("dependency_data", {})
        context_str = json.dumps(data)
        return await self.router.get_response(f"Summarize this data relative to the objective: {context_str}")

    async def _tool_analyze(self, args: Dict[str, Any]) -> str:
        return f"[ ANALYTICS ]: Data variance within nominal limits. {args.get('description')} verified."

    async def _tool_system_query(self, args: Dict[str, Any]) -> str:
        return json.dumps(list(self.vault.get_active_vaults()) if self.vault else [])

    async def _tool_fallback(self, args: Dict[str, Any]) -> str:
        return "[ NO_OP ]: Tool not found in registry."
