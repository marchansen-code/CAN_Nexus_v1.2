"""
User management routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone
import uuid

from database import db
from models import User, UserCreate, RoleUpdate, PasswordChange
from dependencies import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[Dict])
async def get_users(user: User = Depends(get_current_user)):
    """Get all users."""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@router.get("/{user_id}", response_model=Dict)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific user."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user


@router.post("")
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create a new user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer anlegen")
    
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail-Adresse bereits registriert")
    
    if user_data.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "is_blocked": False,
        "recently_viewed": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    return {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "role": user_data.role,
        "message": "Benutzer erfolgreich angelegt"
    }


@router.put("/{user_id}/role")
async def update_user_role(user_id: str, role_update: RoleUpdate, current_user: User = Depends(get_current_user)):
    """Update a user's role (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Rollen ändern")
    
    if role_update.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können Ihre eigene Rolle nicht ändern")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role_update.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    return {"message": f"Rolle auf {role_update.role} geändert"}


@router.put("/{user_id}/password")
async def change_user_password(user_id: str, password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change a user's password (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Passwörter ändern")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen lang sein")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "password_hash": get_password_hash(password_data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"message": "Passwort erfolgreich geändert"}


@router.put("/{user_id}/block")
async def toggle_user_block(user_id: str, current_user: User = Depends(get_current_user)):
    """Block or unblock a user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer sperren")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst sperren")
    
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    new_status = not user_doc.get("is_blocked", False)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_blocked": new_status}}
    )
    
    if new_status:
        await db.user_sessions.delete_many({"user_id": user_id})
    
    return {
        "message": f"Benutzer {'gesperrt' if new_status else 'entsperrt'}",
        "is_blocked": new_status
    }


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user permanently (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Benutzer löschen")
    
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
    
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": "Benutzer gelöscht"}
