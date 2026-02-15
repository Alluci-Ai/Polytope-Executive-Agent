
import os
import logging
from typing import Literal
import google.generativeai as genai

class ModelRouter:
    """
    Routes inference requests based on the complexity and sensitivity of the task.
    """
    def __init__(self):
        self.logger = logging.getLogger("ModelRouter")
        self.api_keys = {
            "google": os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")
        }
        
        if self.api_keys["google"]:
            genai.configure(api_key=self.api_keys["google"])
        else:
            self.logger.warning("GEMINI_API_KEY not found. Inference will return stubs.")

    async def get_response(self, prompt: str, complexity: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM") -> str:
        try:
            # Map complexity to appropriate Gemini models
            # Note: Using standard model names supported by the Python SDK
            if complexity == "HIGH":
                return await self._call_gemini(prompt, model="gemini-1.5-pro")
            elif complexity == "MEDIUM":
                return await self._call_gemini(prompt, model="gemini-1.5-flash")
            else:
                return await self._call_gemini(prompt, model="gemini-1.5-flash")
        except Exception as e:
            self.logger.error(f"Inference failed: {e}")
            return f"[ ERROR: INFERENCE_FAILURE: {str(e)} ]"

    async def _call_gemini(self, prompt: str, model: str) -> str:
        if not self.api_keys["google"]:
             return "[ ERROR: GEMINI_API_KEY_MISSING ]"
        
        try:
            model_instance = genai.GenerativeModel(model)
            response = await model_instance.generate_content_async(prompt)
            return response.text
        except Exception as e:
            self.logger.error(f"Gemini API Error: {e}")
            return f"[ ERROR: GEMINI_API_ERROR: {str(e)} ]"
