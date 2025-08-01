# FILE: api/v1/endpoints/projects.py (Updated)
# ----------------------
# This now fetches projects dynamically for the logged-in user.
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from models.user import UserInDB
from models.project import Project
from services import github_service
from api.v1.dependencies import get_current_user
import urllib.parse

router = APIRouter()

@router.get("/", response_model=List[Project])
def list_user_and_contributed_projects(current_user: UserInDB = Depends(get_current_user)):
    """
    Returns a list of the current user's own public repos and repos
    they have contributed to.
    """
    user_repos = github_service.get_user_repos_for_user(current_user)
    return [{"id": repo['full_name'], "name": repo['full_name']} for repo in user_repos]

@router.get("/{project_id:path}")
def get_project_details(project_id: str, current_user: UserInDB = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns detailed information about a specific project including:
    - Repository statistics
    - Contributors
    - Recent commits
    - Documentation
    - AI summary
    """
    # Decode URL-encoded project_id
    decoded_project_id = urllib.parse.unquote(project_id)
    print(f"DEBUG: Original project_id: {project_id}")
    print(f"DEBUG: Decoded project_id: {decoded_project_id}")
    print(f"DEBUG: Current user: {current_user.username}")
    
    try:
        # Get project details using the user's GitHub token
        print(f"DEBUG: Calling github_service.get_live_project_details")
        project_details = github_service.get_live_project_details(decoded_project_id, current_user)
        print(f"DEBUG: Project details received: {len(project_details) if project_details else 0} items")
        
        # Get AI summary
        try:
            from services import ai_service
            print(f"DEBUG: Calling ai_service.summarize_project")
            summary = ai_service.summarize_project(decoded_project_id, current_user)
            print(f"DEBUG: AI summary received: {len(summary) if summary else 0} characters")
        except Exception as ai_error:
            print(f"AI summary failed: {ai_error}")
            summary = "AI summary not available at the moment."
        
        # Combine all data
        result = {
            "project_id": decoded_project_id,
            "summary": summary,
            "repository_stats": project_details.get("repository_stats", {}),
            "contributors": project_details.get("contributors", []),
            "commits": project_details.get("commits", []),
            "documentation": project_details.get("documentation", ""),
            "pushes": project_details.get("pushes", []),
            "merges": project_details.get("merges", [])
        }
        print(f"DEBUG: Returning result with {len(result)} fields")
        return result
        
    except Exception as e:
        print(f"ERROR: Error getting project details for {decoded_project_id}: {e}")
        print(f"ERROR: Exception type: {type(e)}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        
        # Return fallback data instead of throwing 404
        print(f"DEBUG: Returning fallback data for {decoded_project_id}")
        return {
            "project_id": decoded_project_id,
            "summary": f"Project {decoded_project_id} - Basic information available. Some details may be limited due to access restrictions.",
            "repository_stats": {
                "name": decoded_project_id,
                "description": "Repository information not available",
                "visibility": "unknown"
            },
            "contributors": [],
            "commits": [],
            "documentation": f"# {decoded_project_id}\n\nThis repository's documentation is not currently accessible. This could be due to:\n- Private repository access restrictions\n- Repository not found\n- GitHub API rate limiting\n\nPlease ensure you have the necessary permissions to access this repository.",
            "pushes": [],
            "merges": []
        }

# The rest of the project and chat endpoints can remain largely the same,
# but their internal logic will now rely on the user's token for any
# GitHub API calls if needed. The security dependency `Depends(get_current_user)`
# ensures only logged-in users can access them.