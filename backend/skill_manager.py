
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from .security.vault import VaultManager

logger = logging.getLogger("SkillManager")

class SkillManager:
    """
    Manages the lifecycle, persistence, and retrieval of Cognitive Modules (Skills).
    Uses the Simplicial Vault for encrypted storage of skill manifests.
    """
    def __init__(self, vault: VaultManager):
        self.vault = vault
        # We use a dedicated identifier for the skill registry vault
        self.registry_id = "cognitive_registry"

    def list_skills(self) -> List[Dict[str, Any]]:
        """Retrieve all skills from the vault."""
        data = self.vault.retrieve_secret(self.registry_id)
        return data.get("skills", [])

    def save_skill(self, skill: Dict[str, Any]) -> Dict[str, Any]:
        """Create or Update a skill manifest."""
        data = self.vault.retrieve_secret(self.registry_id)
        current_skills = data.get("skills", [])
        
        # Check if exists (update) or create
        existing_idx = next((i for i, s in enumerate(current_skills) if s.get("id") == skill.get("id")), -1)
        
        # Inject metadata if missing
        if "verified" not in skill:
            skill["verified"] = True
        
        if existing_idx >= 0:
            current_skills[existing_idx] = skill
            action = "UPDATED"
        else:
            current_skills.append(skill)
            action = "CREATED"
            
        self.vault.store_secret(self.registry_id, {"skills": current_skills})
        logger.info(f"Skill {skill.get('id', 'unknown')} {action} in Simplicial Vault.")
        return skill

    def get_skill(self, skill_id: str) -> Optional[Dict[str, Any]]:
        skills = self.list_skills()
        return next((s for s in skills if s.get("id") == skill_id), None)

    def delete_skill(self, skill_id: str) -> bool:
        """Remove a skill from the registry."""
        data = self.vault.retrieve_secret(self.registry_id)
        current_skills = data.get("skills", [])
        
        new_skills = [s for s in current_skills if s.get("id") != skill_id]
        if len(new_skills) == len(current_skills):
            return False
            
        self.vault.store_secret(self.registry_id, {"skills": new_skills})
        logger.info(f"Skill {skill_id} DELETED from Simplicial Vault.")
        return True

    def merge_skills_for_runtime(self, active_ids: List[str]) -> Dict[str, Any]:
        """
        Merges selected skills into a unified cognitive context.
        Useful if backend generation is required.
        """
        all_skills = self.list_skills()
        active = [s for s in all_skills if s["id"] in active_ids]
        
        merged = {
            "knowledge": [],
            "mindsets": [],
            "frameworks": [],
            "logic": [],
            "chainsOfThought": [],
            "vectors": {
                "toneShift": 0.0,
                "creativityShift": 0.0,
                "assertivenessShift": 0.0,
                "empathyShift": 0.0
            }
        }
        
        for s in active:
            merged["knowledge"].extend(s.get("knowledge", []))
            merged["mindsets"].extend(s.get("mindsets", []))
            merged["frameworks"].extend(s.get("frameworks", []))
            merged["logic"].extend(s.get("logic", []))
            merged["chainsOfThought"].extend(s.get("chainsOfThought", []))
            
            mapping = s.get("personalityMapping", {})
            merged["vectors"]["toneShift"] += mapping.get("toneShift", 0)
            merged["vectors"]["creativityShift"] += mapping.get("creativityShift", 0)
            merged["vectors"]["assertivenessShift"] += mapping.get("assertivenessShift", 0)
            merged["vectors"]["empathyShift"] += mapping.get("empathyShift", 0)
            
        return merged
