from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class MessageCreate(BaseModel):
    content: str
    room_id: str
    user_id: str
    user_name: Optional[str] = None

class Message(BaseModel):
    id: str
    content: str
    room_id: str
    user_id: str
    user_name: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

class Room(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    message_count: int = 0
    
    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = None

class MessagesResponse(BaseModel):
    messages: List[Message]
    room: Room
    total_count: int

class RoomsResponse(BaseModel):
    rooms: List[Room]
