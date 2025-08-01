import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

class Database:
    def __init__(self, db_path: str = "messaging.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    room_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            """)
            
            # Create default "General" room if it doesn't exist
            conn.execute("""
                INSERT OR IGNORE INTO rooms (id, name, description)
                VALUES (?, ?, ?)
            """, (str(uuid4()), "General", "General discussion room"))
            
            conn.commit()
    
    def create_room(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat room"""
        room_id = str(uuid4())
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO rooms (id, name, description)
                VALUES (?, ?, ?)
            """, (room_id, name, description))
            conn.commit()
            
            return {
                "id": room_id,
                "name": name,
                "description": description,
                "created_at": datetime.now(),
                "message_count": 0
            }
    
    def get_rooms(self) -> List[Dict[str, Any]]:
        """Get all chat rooms with message counts"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT r.id, r.name, r.description, r.created_at,
                       COUNT(m.id) as message_count
                FROM rooms r
                LEFT JOIN messages m ON r.id = m.room_id
                GROUP BY r.id, r.name, r.description, r.created_at
                ORDER BY r.created_at ASC
            """)
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific room by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT r.id, r.name, r.description, r.created_at,
                       COUNT(m.id) as message_count
                FROM rooms r
                LEFT JOIN messages m ON r.id = m.room_id
                WHERE r.id = ?
                GROUP BY r.id, r.name, r.description, r.created_at
            """, (room_id,))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_message(self, content: str, room_id: str, user_id: str, user_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new message"""
        message_id = str(uuid4())
        timestamp = datetime.now()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO messages (id, content, room_id, user_id, user_name, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (message_id, content, room_id, user_id, user_name, timestamp))
            conn.commit()
            
            return {
                "id": message_id,
                "content": content,
                "room_id": room_id,
                "user_id": user_id,
                "user_name": user_name,
                "timestamp": timestamp
            }
    
    def get_messages(self, room_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get messages for a room"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT id, content, room_id, user_id, user_name, timestamp
                FROM messages
                WHERE room_id = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """, (room_id, limit, offset))
            
            messages = [dict(row) for row in cursor.fetchall()]
            # Reverse to get chronological order (oldest first)
            return list(reversed(messages))
    
    def get_message_count(self, room_id: str) -> int:
        """Get total message count for a room"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT COUNT(*) FROM messages WHERE room_id = ?
            """, (room_id,))
            return cursor.fetchone()[0]

# Global database instance
db = Database()
