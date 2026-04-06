"""Authentication endpoints for Grimoire."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator

from ..config import SessionLocal
from ..models import User
from ..auth import (
    get_current_user,
    CurrentUser,
    hash_password,
    verify_password,
    create_token,
)


class LoginRequest(BaseModel):
    username: str
    password: str


class SetupRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Username must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


public_router = APIRouter(prefix="/api/auth")


@public_router.get(
    "/status",
    tags=["auth"],
    summary="Check initialization status",
    description="Returns whether the server has any users. Used by the frontend to decide whether to show the first-run setup screen.",
)
def auth_status():
    db = SessionLocal()
    try:
        return {"initialized": db.query(User).count() > 0}
    finally:
        db.close()


@public_router.post(
    "/setup",
    tags=["auth"],
    summary="First-run admin setup",
    description="Creates the initial admin account. Returns a JWT. Fails if any users already exist.",
)
def auth_setup(data: SetupRequest):
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            raise HTTPException(400, "Server is already initialized")
        user = User(
            username=data.username,
            hashed_password=hash_password(data.password),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_token(user.id, user.username, user.role)
        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "role": user.role},
        }
    finally:
        db.close()


@public_router.post(
    "/login",
    tags=["auth"],
    summary="Log in",
    description="Authenticates with username and password. Returns a JWT valid for 30 days.",
)
def auth_login(data: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(username=data.username).first()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(401, "Invalid username or password")
        token = create_token(user.id, user.username, user.role)
        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "role": user.role},
        }
    finally:
        db.close()


router = APIRouter()


@router.get(
    "/auth/me",
    tags=["auth"],
    summary="Get current user",
    description="Returns the authenticated user's id, username, role, and preferences.",
)
def auth_me(user: CurrentUser = Depends(get_current_user)):
    db = SessionLocal()
    try:
        u = db.query(User).filter_by(id=user.id).first()
        if not u:
            raise HTTPException(401, "User no longer exists")
        allow_explicit = u.allow_explicit if u.allow_explicit is not None else True
    finally:
        db.close()
    return {
        "id": u.id,
        "username": u.username,
        "display_name": u.display_name,
        "role": u.role,
        "allow_explicit": allow_explicit,
    }
