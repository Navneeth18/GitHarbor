# FILE: api/v1/endpoints/admin.py (New File)
# ----------------------
from fastapi import APIRouter, Depends, HTTPException
from services import db_service
from api.v1.dependencies import require_admin

router = APIRouter()

@router.post("/projects/{project_id:path}/assign/{username}")
def assign_project(project_id: str, username: str, admin: dict = Depends(require_admin)):
    """Assigns a project to a user. Admin only."""
    success = db_service.assign_project_to_user(username, project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found or project already assigned.")
    return {"message": f"Project '{project_id}' assigned to '{username}' successfully."}