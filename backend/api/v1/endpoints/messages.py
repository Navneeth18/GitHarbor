from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.message import (
    Message, MessageCreate, Room, RoomCreate,
    MessagesResponse, RoomsResponse
)
from database import db

router = APIRouter()

@router.post("/send", response_model=Message)
def send_message(message_data: MessageCreate):
    """
    Send a new message to a room
    """
    # Verify room exists
    room = db.get_room(message_data.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Create the message
    message = db.create_message(
        content=message_data.content,
        room_id=message_data.room_id,
        user_id=message_data.user_id,
        user_name=message_data.user_name
    )

    return Message(**message)

@router.get("/{room_id}", response_model=MessagesResponse)
def get_messages(
    room_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get messages for a specific room
    """
    # Verify room exists
    room = db.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get messages
    messages_data = db.get_messages(room_id, limit, offset)
    messages = [Message(**msg) for msg in messages_data]

    # Get total count
    total_count = db.get_message_count(room_id)

    return MessagesResponse(
        messages=messages,
        room=Room(**room),
        total_count=total_count
    )

@router.get("/", response_model=List[Message])
def get_recent_messages(
    limit: int = Query(20, ge=1, le=100),
    room_id: Optional[str] = Query(None)
):
    """
    Get recent messages across all rooms or for a specific room
    """
    if room_id:
        # Get messages for specific room
        messages_data = db.get_messages(room_id, limit, 0)
    else:
        # Get recent messages across all rooms (we'll implement this)
        # For now, just return empty list for global messages
        messages_data = []

    return [Message(**msg) for msg in messages_data]
