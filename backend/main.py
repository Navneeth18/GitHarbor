
# FILE: main.py (Updated)
# ----------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.api import api_router
from services.db_service import client # Import the client

app = FastAPI(title="Kortex AI Backend")

# --- CORS (Cross-Origin Resource Sharing) ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Add a shutdown event to close the DB connection ---
@app.on_event("shutdown")
def shutdown_db_client():
    client.close()
    print("MongoDB connection closed.")

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Kortex AI Backend (v2 with Auth)"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend is running"}