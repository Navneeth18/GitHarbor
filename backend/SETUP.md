# Backend Setup Guide

## Environment Variables Setup

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Google AI API Key (Required for AI features)
GOOGLE_API_KEY=your_google_api_key_here

# GitHub Configuration
GITHUB_PAT=your_github_personal_access_token_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# MongoDB Configuration (Optional - will use fallback if not available)
MONGO_URI=your_mongodb_connection_string_here

# JWT Configuration
SECRET_KEY=your_secret_key_here_make_it_long_and_random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Encryption Key for sensitive data
ENCRYPTION_KEY=your_encryption_key_here_make_it_32_bytes
```

## Getting API Keys

### Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it as `GOOGLE_API_KEY`

### GitHub Configuration
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set the callback URL to `http://localhost:5173/auth/callback`
4. Copy the Client ID and Client Secret
5. For Personal Access Token, go to Settings > Developer settings > Personal access tokens
6. Create a new token with `repo` and `user` scopes

## Running the Backend

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- If `GOOGLE_API_KEY` is not configured, AI features will be limited but the app will still work
- If `SECRET_KEY` is not configured, a default key will be used (not secure for production)
- The backend will automatically handle missing environment variables gracefully 