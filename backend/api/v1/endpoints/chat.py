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
    Receives a question from any authenticated user.
    """
    response = ai_service.query_project(query.project_id, query.question, current_user)
    return response