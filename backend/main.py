"""
FMCG OpsCopilot — FastAPI Backend
===================================
Serves the API + static frontend files.
Run: uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.routers import auth, orders, analytics
import os

app = FastAPI(title="FMCG Supply Chain Copilot API", version="1.0.0")

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# Serve static frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/health")
def health_check():
    return {"status": "FMCG Copilot API Running", "version": "1.0.0"}
