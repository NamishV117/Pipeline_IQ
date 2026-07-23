"""
Auth Router (Member 2)
========================
POST /api/auth/login  → validate credentials, return user + role
GET  /api/auth/me     → return current user metadata
"""

from fastapi import APIRouter, HTTPException
from backend.models import LoginRequest
from backend.database import authenticate, get_entity_info

router = APIRouter()


@router.post("/login")
def login(req: LoginRequest):
    user = authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    entity = get_entity_info(user["entity_id"])
    return {
        "user": user,
        "entity": entity,
    }
