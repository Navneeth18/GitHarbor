# FILE: api/v1/endpoints/chat.py (Updated)
# ----------------------
from fastapi import APIRouter, Depends, HTTPException # <-- Add Depends
from models.chat import ChatQuery, ChatResponse
from models.user import UserInDB # <-- Import User model
from services import ai_service
from api.v1.dependencies import get_current_user # <-- Import security dependency

router = APIRouter()

@router.post("/ask", response_model=ChatResponse)
def ask_question(query: ChatQuery, current_user: UserInDB = Depends(get_current_user)):
    """
    Receives a question, but only if the user is assigned to the project.
    """
    # Admins have access to all projects
    if current_user.role != 'admin' and query.project_id not in current_user.assigned_projects:
        raise HTTPException(status_code=403, detail="Not authorized to ask questions about this project")

    response = ai_service.query_project(query.project_id, query.question)
    return response