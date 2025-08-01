# FILE: main.py (Updated)
# ----------------------
# This is the main entry point for the FastAPI application.
# The on_startup event has been removed.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.api import api_router

# Create the FastAPI app instance
app = FastAPI(title="Kortex AI Backend")

# --- CORS (Cross-Origin Resource Sharing) ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Router ---
app.include_router(api_router, prefix="/api/v1")

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Kortex AI Backend (Live API Version)"}

