# FILE: api/v1/endpoints/projects.py (Updated)
# ----------------------
# This now fetches projects dynamically for the logged-in user.
from fastapi import APIRouter, Depends
from typing import List
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

# The rest of the project and chat endpoints can remain largely the same,
# but their internal logic will now rely on the user's token for any
# GitHub API calls if needed. The security dependency `Depends(get_current_user)`
# ensures only logged-in users can access them.