from fastapi import APIRouter, HTTPException
from typing import List
from models.message import Room, RoomCreate, RoomsResponse
from database import db

router = APIRouter()

@router.get("/", response_model=RoomsResponse)
def get_rooms():
    """
    Get all available chat rooms
    """
    rooms_data = db.get_rooms()
    rooms = [Room(**room) for room in rooms_data]

    return RoomsResponse(rooms=rooms)

@router.post("/", response_model=Room)
def create_room(room_data: RoomCreate):
    """
    Create a new chat room
    """
    try:
        room = db.create_room(
            name=room_data.name,
            description=room_data.description
        )
        return Room(**room)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Room name already exists")
        raise HTTPException(status_code=500, detail="Failed to create room")

@router.get("/{room_id}", response_model=Room)
def get_room(room_id: str):
    """
    Get a specific room by ID
    """
    room = db.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return Room(**room)
