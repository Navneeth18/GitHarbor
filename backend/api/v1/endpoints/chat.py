# FILE: api/v1/endpoints/chat.py
# ----------------------
from fastapi import APIRouter
from models.chat import ChatQuery, ChatResponse
from services import ai_service

router = APIRouter()

@router.post("/ask", response_model=ChatResponse)
def ask_question(query: ChatQuery):
    """
    Receives a question about a project and returns an AI-generated answer.
    """
    response = ai_service.query_project(query.project_id, query.question)
    return response
