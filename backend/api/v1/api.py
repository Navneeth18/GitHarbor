# FILE: api/v1/api.py
# ----------------------
# This file combines all the endpoint routers into one.
from fastapi import APIRouter
from .endpoints import projects, chat

api_router = APIRouter()
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
