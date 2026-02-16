import asyncio
import logging
import json
from typing import Dict, Any, Callable, Set
from tenacity import retry, stop_after_attempt, wait_exponential
from ..models import DAGTask, TaskStatus

logger = logging.getLogger("Engine.Executor")

class Executor:
    """
    Executes a DAG of tasks, respecting topological order and parallelism.
    """
    def __init__(self, tool_registry: Dict[str, Callable], max_concurrent: int = 5):
        self.tool_registry = tool_registry
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def execute_dag(self, tasks: Dict[str, DAGTask]) -> Dict[str, DAGTask]:
        """
        Main execution loop. Returns the updated tasks dictionary.
        """
        completed_ids: Set[str] = {t_id for t_id, t in tasks.items() if t.status == TaskStatus.COMPLETED}
        failed_ids: Set[str] = set()
        
        # Determine strict processing order based on dependencies
        # Simple approach: Loop until all done or stuck
        
        while True:
            # Find executable tasks
            executable = []
            pending_count = 0
            
            for t_id, task in tasks.items():
                if task.status == TaskStatus.COMPLETED or task.status == TaskStatus.FAILED:
                    continue
                
                pending_count += 1
                
                # Check dependencies
                deps_met = all(d in completed_ids for d in task.dependencies)
                deps_failed = any(d in failed_ids for d in task.dependencies)
                
                if deps_failed:
                    task.status = TaskStatus.FAILED
                    task.result = "Dependency failed."
                    failed_ids.add(t_id)
                elif deps_met and task.status == TaskStatus.PENDING:
                    executable.append(t_id)

            if not executable and pending_count > 0:
                # If we have pending tasks but nothing is executable, it's a deadlock or remaining tasks depend on failed ones
                break
                
            if pending_count == 0:
                break

            # Execute batch concurrently
            futures = [self._run_task(tasks[t_id], tasks) for t_id in executable]
            results = await asyncio.gather(*futures, return_exceptions=True)
            
            for res in results:
                if isinstance(res, DAGTask):
                    if res.status == TaskStatus.COMPLETED:
                        completed_ids.add(res.id)
                    else:
                        failed_ids.add(res.id)
        
        return tasks

    async def _run_task(self, task: DAGTask, all_tasks: Dict[str, DAGTask]) -> DAGTask:
        async with self.semaphore:
            task.status = TaskStatus.RUNNING
            
            # Context Injection: Pass results of dependencies
            dep_context = {
                dep: all_tasks[dep].result 
                for dep in task.dependencies 
                if all_tasks[dep].status == TaskStatus.COMPLETED
            }
            task.args["dependency_output"] = dep_context

            try:
                result = await self._execute_tool_safe(task.action, task.args)
                task.result = result
                task.status = TaskStatus.COMPLETED
                logger.info(f"Task {task.id} ({task.action}) ✅")
            except Exception as e:
                logger.error(f"Task {task.id} ({task.action}) ❌ : {e}")
                task.result = str(e)
                task.status = TaskStatus.FAILED
            
            return task

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _execute_tool_safe(self, action: str, args: Dict[str, Any]) -> str:
        """
        Executes a tool with automatic retries for transient failures.
        """
        handler = self.tool_registry.get(action, self._tool_fallback)
        
        if asyncio.iscoroutinefunction(handler):
            return await handler(args)
        else:
            return handler(args)

    async def _tool_fallback(self, args: Dict[str, Any]) -> str:
        return f"[ ERROR ]: Tool implementation missing for args: {json.dumps(args)[:50]}..."
