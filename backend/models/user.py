# FILE: models/user.py (Updated)
# ----------------------
from pydantic import BaseModel, Field
from typing import Optional

class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    github_id: int
    username: str
    avatar_url: str
    encrypted_github_token: Optional[bytes] = None # Store the encrypted token

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
