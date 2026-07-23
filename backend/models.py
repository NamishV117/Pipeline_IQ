"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class OrderCreate(BaseModel):
    from_entity: str
    to_entity: str
    sku_id: str
    qty: int


class CopilotQuery(BaseModel):
    role: str
    query: str
