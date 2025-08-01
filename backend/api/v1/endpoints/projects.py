# FILE: api/v1/endpoints/projects.py (Updated)
# ----------------------
# This now fetches projects dynamically for the logged-in user.
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from models.user import UserInDB
from models.project import Project
from services import github_service
from api.v1.dependencies import get_current_user

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
    try:
        # Get project details using the user's GitHub token
        project_details = github_service.get_live_project_details(project_id, current_user)
        
        # Get AI summary
        try:
            from services import ai_service
            summary = ai_service.summarize_project(project_id, current_user)
        except Exception as ai_error:
            print(f"AI summary failed: {ai_error}")
            summary = "AI summary not available at the moment."
        
        # Combine all data
        return {
            "project_id": project_id,
            "summary": summary,
            "repository_stats": project_details.get("repository_stats", {}),
            "contributors": project_details.get("contributors", []),
            "commits": project_details.get("commits", []),
            "documentation": project_details.get("documentation", ""),
            "pushes": project_details.get("pushes", []),
            "merges": project_details.get("merges", [])
        }
        
    except Exception as e:
        print(f"Error getting project details for {project_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found or access denied")

# The rest of the project and chat endpoints can remain largely the same,
# but their internal logic will now rely on the user's token for any
# GitHub API calls if needed. The security dependency `Depends(get_current_user)`
# ensures only logged-in users can access them.