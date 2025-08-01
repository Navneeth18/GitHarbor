# FILE: api/v1/endpoints/projects.py (Updated)
# ----------------------
from fastapi import APIRouter, HTTPException
from typing import List
from models.project import Project, ProjectDetails
from services import github_service, ai_service
from core.config import PROJECT_REPOS

router = APIRouter()

@router.get("/", response_model=List[Project])
def list_projects():
    """
    Returns a list of the projects configured in the .env file.
    """
    projects = [{"id": repo, "name": repo} for repo in PROJECT_REPOS]
    return projects

@router.get("/{project_id:path}", response_model=ProjectDetails)
def get_project_dashboard(project_id: str):
    """
    Fetches live dashboard details and an AI summary for a specific project.
    """
    if project_id not in PROJECT_REPOS:
        raise HTTPException(status_code=404, detail="Project not found")
    
    details = github_service.get_live_project_details(project_id)
    summary = ai_service.summarize_project(project_id)
    
    # Combine the data into the response model
    response_data = {
        "summary": summary,
        **details
    }
    return response_data