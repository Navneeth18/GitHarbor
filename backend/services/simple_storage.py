# FILE: services/simple_storage.py (Fallback Storage)
# ----------------------
# Simple in-memory storage for testing when MongoDB is not available
from typing import Optional, Dict, Any
from models.user import UserInDB
import logging

logger = logging.getLogger(__name__)

# In-memory storage
users_storage: Dict[str, Dict[str, Any]] = {}

def get_user_by_username(username: str) -> Optional[UserInDB]:
    try:
        user_data = users_storage.get(username)
        if user_data:
            # Create UserInDB with _id field (matching the alias in the model)
            return UserInDB(
                _id=user_data.get("_id", username),
                github_id=user_data["github_id"],
                username=user_data["username"],
                avatar_url=user_data["avatar_url"],
                encrypted_github_token=user_data.get("encrypted_github_token")
            )
        return None
    except Exception as e:
        logger.error(f"Error getting user by username {username}: {e}")
        raise

def create_or_update_user(github_data: dict, github_token: str) -> UserInDB:
    try:
        from . import encryption_service
        
        user = get_user_by_username(github_data['login'])
        
        encrypted_token = encryption_service.encrypt_token(github_token)

        user_data_for_db = {
            "_id": github_data['login'],
            "github_id": github_data['id'],
            "username": github_data['login'],
            "avatar_url": github_data['avatar_url'],
            "encrypted_github_token": encrypted_token,
        }

        # Store in memory
        users_storage[github_data['login']] = user_data_for_db
            
        return get_user_by_username(github_data['login'])
    except Exception as e:
        logger.error(f"Error creating/updating user {github_data.get('login', 'unknown')}: {e}")
        raise

def assign_project_to_user(username: str, project_id: str) -> bool:
    try:
        if username in users_storage:
            if "assigned_projects" not in users_storage[username]:
                users_storage[username]["assigned_projects"] = []
            if project_id not in users_storage[username]["assigned_projects"]:
                users_storage[username]["assigned_projects"].append(project_id)
                return True
        return False
    except Exception as e:
        logger.error(f"Error assigning project {project_id} to user {username}: {e}")
        raise 