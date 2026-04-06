"""Self-service user endpoints (preferences, password, account deletion)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from ...config import SessionLocal
from ...models import User
from ...auth import get_current_user, CurrentUser, hash_password, verify_password
from ._schemas import PasswordChange, PreferencesUpdate

router = APIRouter()


def update_own_preferences(
    data: PreferencesUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=current_user.id).first()
        if not user:
            raise HTTPException(404, "User not found")
        if data.allow_explicit is not None:
            user.allow_explicit = data.allow_explicit
        if data.display_name is not None:
            user.display_name = data.display_name.strip() or None
        db.commit()
        return {"allow_explicit": user.allow_explicit, "display_name": user.display_name}
    finally:
        db.close()


def change_own_password(
    data: PasswordChange,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=current_user.id).first()
        if not user:
            raise HTTPException(404, "User not found")
        if not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(400, "Current password is incorrect")
        user.hashed_password = hash_password(data.new_password)
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()


def delete_own_account(current_user: CurrentUser = Depends(get_current_user)):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=current_user.id).first()
        if not user:
            raise HTTPException(404, "User not found")
        if user.role == "admin":
            raise HTTPException(400, "Admin accounts cannot be self-deleted")
        db.execute(text("DELETE FROM bookmarks WHERE user_id = :uid"), {"uid": user.id})
        db.execute(text("DELETE FROM favorites WHERE user_id = :uid"), {"uid": user.id})
        db.delete(user)
        db.commit()
    finally:
        db.close()
