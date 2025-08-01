# FILE: api/v1/api.py (Updated)
# ----------------------
# Simplified to remove the admin router.
from fastapi import APIRouter
from .endpoints import projects, chat, auth, messages, rooms, search

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(search.router, prefix="/search", tags=["Global Search"])
