# FILE: core/config.py
# ----------------------
# This file loads your environment variables.

import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Retrieve the Google API key from the environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GITHUB_PAT = os.getenv("GITHUB_PAT")
MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# Provide default values for optional configurations
if not GOOGLE_API_KEY or GOOGLE_API_KEY == "your_google_api_key_here":
    print("WARNING: GOOGLE_API_KEY not configured. AI features will be limited.")
    GOOGLE_API_KEY = None

if not SECRET_KEY or SECRET_KEY == "your_secret_key_here_make_it_long_and_random":
    print("WARNING: SECRET_KEY not configured. Using default key (not secure for production).")
    SECRET_KEY = "default_secret_key_change_in_production_environment"

