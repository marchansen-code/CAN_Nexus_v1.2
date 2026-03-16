"""
Group management routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone

from database import db
from models import User, Group, GroupCreate, UserGroupUpdate
from dependencies import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("", response_model=List[Dict])
async def get_groups(user: User = Depends(get_current_user)):
    """Get all groups."""
    groups = await db.groups.find({}, {"_id": 0}).to_list(100)
    return groups


@router.post("", response_model=Dict)
async def create_group(group: GroupCreate, user: User = Depends(get_current_user)):
    """Create a new group (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Gruppen erstellen")
    
    existing = await db.groups.find_one({"name": group.name})
    if existing:
        raise HTTPException(status_code=400, detail="Eine Gruppe mit diesem Namen existiert bereits")
    
    group_doc = Group(
        name=group.name,
        description=group.description,
        created_by=user.user_id
    )
    doc = group_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.groups.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/{group_id}", response_model=Dict)
async def update_group(group_id: str, group: GroupCreate, user: User = Depends(get_current_user)):
    """Update a group (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Gruppen bearbeiten")
    
    result = await db.groups.update_one(
        {"group_id": group_id},
        {"$set": {
            "name": group.name,
            "description": group.description,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    updated = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    return updated


@router.delete("/{group_id}")
async def delete_group(group_id: str, user: User = Depends(get_current_user)):
    """Delete a group (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Gruppen löschen")
    
    await db.users.update_many(
        {"group_ids": group_id},
        {"$pull": {"group_ids": group_id}}
    )
    
    await db.articles.update_many(
        {"visible_to_groups": group_id},
        {"$pull": {"visible_to_groups": group_id}}
    )
    
    result = await db.groups.delete_one({"group_id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    return {"message": "Gruppe gelöscht"}


@router.get("/{group_id}/members")
async def get_group_members(group_id: str, user: User = Depends(get_current_user)):
    """Get all members of a group."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren")
    
    members = await db.users.find(
        {"group_ids": group_id},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return members


# User group assignment (placed here for logical grouping)
async def update_user_groups_handler(user_id: str, data: UserGroupUpdate, current_user: User):
    """Update user's group memberships (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Gruppenzugehörigkeiten ändern")
    
    for gid in data.group_ids:
        exists = await db.groups.find_one({"group_id": gid})
        if not exists:
            raise HTTPException(status_code=400, detail=f"Gruppe {gid} nicht gefunden")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"group_ids": data.group_ids}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    return {"message": "Gruppenzugehörigkeiten aktualisiert", "group_ids": data.group_ids}
