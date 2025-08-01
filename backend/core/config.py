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

# Retrieve and parse the project repositories
PROJECT_REPOS_STR = os.getenv("PROJECT_REPOS", "")
PROJECT_REPOS = [repo.strip() for repo in PROJECT_REPOS_STR.split(',') if repo.strip()]

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file")
if not PROJECT_REPOS:
    raise ValueError("PROJECT_REPOS not found or empty in .env file")

