from pydantic import BaseModel
from typing import List, Dict, Any

class Project(BaseModel):
    id: str
    name: str

class ProjectDetails(BaseModel):
    project_id: str
    summary: str # Added summary field
    commits: List[Dict[str, Any]]
    pull_requests: List[Dict[str, Any]]
    contributors: List[Dict[str, Any]]
    documentation: str
    pushes: List[Dict[str, Any]]  # Push events information
    merges: List[Dict[str, Any]]  # Merge information from pull requests
    repository_stats: Dict[str, Any]  # Additional repository statistics
