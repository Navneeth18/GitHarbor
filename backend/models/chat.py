from pydantic import BaseModel
from typing import List, Dict, Any

class ChatQuery(BaseModel):
    project_id: str
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]