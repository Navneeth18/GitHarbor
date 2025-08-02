# FILE: api/v1/endpoints/auth.py (Updated)
# ----------------------
# This file is updated to pass the github_token to the db_service
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
import requests
import logging
from core.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
from services import auth_service
from models.user import Token, UserInDB
from api.v1.dependencies import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/login")
def login_with_github():
    redirect_uri = "http://127.0.0.1:8000/api/v1/auth/callback"
    github_auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}"
    return github_auth_url

@router.get("/callback")
def github_callback(code: str):
    try:
        logger.info(f"Received callback with code: {code[:10]}...")
        
        token_url = "https://github.com/login/oauth/access_token"
        redirect_uri = "http://127.0.0.1:8000/api/v1/auth/callback"
        params = {
            "client_id": GITHUB_CLIENT_ID, 
            "client_secret": GITHUB_CLIENT_SECRET, 
            "code": code,
            "redirect_uri": redirect_uri
        }
        headers = {"Accept": "application/json"}
        
        logger.info("Exchanging code for token...")
        response = requests.post(token_url, params=params, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"GitHub token exchange failed: {response.status_code} - {response.text}")
            return RedirectResponse(url="http://localhost:5173/?error=auth_failed")
        
        github_token = response.json().get("access_token")
        if not github_token:
            logger.error("No access token received from GitHub")
            return RedirectResponse(url="http://localhost:5173/?error=auth_failed")
        
        logger.info("Getting user data from GitHub...")
        user_url = "https://api.github.com/user"
        headers = {"Authorization": f"token {github_token}"}
        user_response = requests.get(user_url, headers=headers)
        
        if user_response.status_code != 200:
            logger.error(f"GitHub user API failed: {user_response.status_code}")
            return RedirectResponse(url="http://localhost:5173/?error=auth_failed")
        
        github_user_data = user_response.json()
        logger.info(f"User data received for: {github_user_data.get('login', 'unknown')}")

        # Try to use MongoDB first, fallback to simple storage
        try:
            from services import db_service
            logger.info("Creating/updating user in MongoDB...")
            user = db_service.create_or_update_user(github_user_data, github_token)
        except Exception as db_error:
            logger.warning(f"MongoDB failed, using simple storage: {db_error}")
            from services import simple_storage
            user = simple_storage.create_or_update_user(github_user_data, github_token)
        
        logger.info("Creating access token...")
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        # Redirect to frontend with the token
        frontend_url = f"http://localhost:5173/?token={access_token}"
        logger.info("Redirecting to frontend with token")
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logger.error(f"Error in callback: {str(e)}", exc_info=True)
        return RedirectResponse(url="http://localhost:5173/?error=auth_failed")

@router.post("/refresh-token")
def refresh_github_token(current_user: UserInDB = Depends(get_current_user)):
    """
    Refreshes the GitHub token by re-authenticating with GitHub
    """
    try:
        logger.info(f"Refreshing token for user: {current_user.username}")
        
        # Generate a new OAuth URL for re-authentication
        redirect_uri = "http://127.0.0.1:8000/api/v1/auth/callback"
        github_auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope=repo,user"
        
        return {
            "auth_url": github_auth_url,
            "message": "Please re-authenticate with GitHub to refresh your token"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to refresh token")

@router.get("/validate")
def validate_token(current_user: UserInDB = Depends(get_current_user)):
    """
    Validates the current user's token and returns user info
    """
    return {
        "valid": True,
        "user": {
            "username": current_user.username,
            "github_id": current_user.github_id,
            "avatar_url": current_user.avatar_url
        }
    }