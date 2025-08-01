# FILE: api/v1/dependencies.py (Updated)
# ----------------------
# Simplified to just get the current user based on our JWT
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from core.config import SECRET_KEY, ALGORITHM
from models.user import TokenData, UserInDB
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Try MongoDB first, fallback to simple storage
    try:
        from services import db_service
        user = db_service.get_user_by_username(username=username)
    except Exception as db_error:
        logger.warning(f"MongoDB failed, trying simple storage: {db_error}")
        try:
            from services import simple_storage
            user = simple_storage.get_user_by_username(username=username)
        except Exception as storage_error:
            logger.error(f"Both MongoDB and simple storage failed: {storage_error}")
            raise credentials_exception
    
    if user is None:
        raise credentials_exception
    return user