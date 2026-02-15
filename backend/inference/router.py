
import os
import logging
import json
from typing import Literal, Dict, Any, List
import google.generativeai as genai
from ..config import load_settings

class ModelRouter:
    """
    Routes inference requests based on the complexity and sensitivity of the task.
    Implements real API calls to Google Gemini.
    """
    def __init__(self, settings):
        self.logger = logging.getLogger("ModelRouter")
        self.settings = settings
        
        genai.configure(api_key=self.settings.GEMINI_API_KEY)
        self.model_flash = genai.GenerativeModel("gemini-1.5-flash")
        self.model_pro = genai.GenerativeModel("gemini-1.5-pro")

    async def get_response(self, prompt: str, complexity: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM") -> str:
        try:
            model = self.model_pro if complexity == "HIGH" else self.model_flash
            
            # Add system context for JSON output if needed by checking prompt
            generation_config = {}
            if "json" in prompt.lower():
                generation_config = {"response_mime_type": "application/json"}

            response = await model.generate_content_async(
                prompt, 
                generation_config=generation_config
            )
            return response.text
        except Exception as e:
            self.logger.error(f"Inference failed: {e}")
            # In a full production system, this is where failover to Anthropic/OpenAI would happen
            raise RuntimeError(f"Primary Inference Layer Failed: {e}")

    async def get_structured_plan(self, objective: str) -> Dict[str, Any]:
        """Specific helper to force a JSON plan from the LLM."""
        prompt = f"""
        You are the Planner for an Autonomous Executive Agent.
        Objective: "{objective}"
        
        Break this objective down into a list of executable steps.
        Available Tools: "web_search", "summarize", "analyze_data", "system_query".
        
        Return ONLY valid JSON with this schema:
        {{
            "steps": [
                {{ "id": "step_1", "description": "Search for X", "tool": "web_search", "dependencies": [] }},
                {{ "id": "step_2", "description": "Summarize findings", "tool": "summarize", "dependencies": ["step_1"] }}
            ]
        }}
        """
        try:
            response = await self.model_flash.generate_content_async(
                prompt, 
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            self.logger.error(f"Planning failed: {e}")
            return {"steps": []}
            
    async def refine_plan(self, objective: str, original_plan: List[Dict[str, Any]], execution_results: str, critic_feedback: str, failed_tasks: List[str]) -> Dict[str, Any]:
        """
        Self-Correction Loop: Generates an improved plan based on failure analysis.
        Uses the stronger model (Pro) for reasoning about failures.
        """
        prompt = f"""
        SYSTEM: You are the Strategic Correction Engine.
        CONTEXT: An autonomous agent attempted a task and failed validation.
        
        OBJECTIVE: "{objective}"
        
        PRIOR PLAN: {json.dumps(original_plan)}
        RESULTS: {execution_results}
        FAILED TASKS: {json.dumps(failed_tasks)}
        CRITIC FEEDBACK: "{critic_feedback}"
        
        INSTRUCTION: Generate a REVISED plan to satisfy the objective.
        - Fix logic errors in failed tasks.
        - Add verification steps if the critic noted missing accuracy.
        - Remove redundant steps.
        
        TOOLS: "web_search", "summarize", "analyze_data", "system_query".
        
        OUTPUT: JSON schema {{ "steps": [ {{ "id": "...", "description": "...", "tool": "...", "dependencies": [] }} ] }}
        """
        try:
            response = await self.model_pro.generate_content_async(
                prompt, 
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            self.logger.error(f"Plan refinement failed: {e}")
            return {"steps": []}

    async def critique_result(self, objective: str, result: str) -> Dict[str, Any]:
        prompt = f"""
        Objective: {objective}
        Result: {result}
        
        Rate the success of this result from 0.0 to 1.0. 
        Return JSON: {{ "score": 0.0, "feedback": "reasoning" }}
        """
        try:
            response = await self.model_flash.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except:
            return {"score": 0.5, "feedback": "Critic failed to evaluate."}
