# FILE: services/encryption_service.py (New File)
# ----------------------
from cryptography.fernet import Fernet
from core.config import ENCRYPTION_KEY
import logging

logger = logging.getLogger(__name__)

# Validate ENCRYPTION_KEY
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY is not set in environment variables")

try:
    cipher_suite = Fernet(ENCRYPTION_KEY.encode())
except Exception as e:
    logger.error(f"Failed to initialize Fernet cipher: {e}")
    raise ValueError(f"Invalid ENCRYPTION_KEY: {e}")

def encrypt_token(token: str) -> bytes:
    try:
        return cipher_suite.encrypt(token.encode())
    except Exception as e:
        logger.error(f"Failed to encrypt token: {e}")
        raise

def decrypt_token(encrypted_token: bytes) -> str:
    try:
        return cipher_suite.decrypt(encrypted_token).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        raise 