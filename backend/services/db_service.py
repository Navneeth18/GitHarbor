# FILE: services/db_service.py (Updated)
# ----------------------
from pymongo import MongoClient
from typing import Optional
from core.config import MONGO_URI
from models.user import UserInDB
from . import encryption_service # Import our new service
import logging

logger = logging.getLogger(__name__)

# Validate MONGO_URI
if not MONGO_URI:
    raise ValueError("MONGO_URI is not set in environment variables")

try:
    # Configure MongoDB client with proper SSL settings
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,  # 5 second timeout
        connectTimeoutMS=10000,         # 10 second connect timeout
        socketTimeoutMS=10000,          # 10 second socket timeout
        maxPoolSize=10,                 # Connection pool size
        retryWrites=True,               # Enable retry writes
        retryReads=True,                # Enable retry reads
        # SSL configuration for MongoDB Atlas
        tls=True,
        tlsAllowInvalidCertificates=False,
        tlsAllowInvalidHostnames=False,
    )
    
    # Test the connection (but don't fail startup if it fails)
    try:
        client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
    except Exception as ping_error:
        logger.warning(f"MongoDB connection test failed: {ping_error}")
        logger.info("Continuing startup - connection will be tested when needed")
        
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    raise ValueError(f"Invalid MONGO_URI: {e}")

db = client.get_database("kortex")
user_collection = db.get_collection("users")

def get_user_by_username(username: str) -> Optional[UserInDB]:
    try:
        user_data = user_collection.find_one({"username": username})
        if user_data:
            return UserInDB(**user_data, _id=str(user_data["_id"]))
        return None
    except Exception as e:
        logger.error(f"Error getting user by username {username}: {e}")
        raise

def create_or_update_user(github_data: dict, github_token: str) -> UserInDB:
    try:
        user = get_user_by_username(github_data['login'])
        
        encrypted_token = encryption_service.encrypt_token(github_token)

        user_data_for_db = {
            "github_id": github_data['id'],
            "username": github_data['login'],
            "avatar_url": github_data['avatar_url'],
            "encrypted_github_token": encrypted_token, # Store the encrypted token
        }

        if user:
            user_collection.update_one(
                {"username": github_data['login']},
                {"$set": user_data_for_db}
            )
        else:
            user_collection.insert_one(user_data_for_db)
            
        return get_user_by_username(github_data['login'])
    except Exception as e:
        logger.error(f"Error creating/updating user {github_data.get('login', 'unknown')}: {e}")
        raise

def assign_project_to_user(username: str, project_id: str) -> bool:
    try:
        result = user_collection.update_one(
            {"username": username},
            {"$addToSet": {"assigned_projects": project_id}} # $addToSet prevents duplicates
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error assigning project {project_id} to user {username}: {e}")
        raise