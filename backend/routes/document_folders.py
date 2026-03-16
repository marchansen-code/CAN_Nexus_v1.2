"""
Document folder management routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from models import User
from dependencies import get_current_user

router = APIRouter(prefix="/document-folders", tags=["Document Folders"])


class DocumentFolder(BaseModel):
    folder_id: str = Field(default_factory=lambda: f"dfolder_{uuid.uuid4().hex[:12]}")
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0


@router.get("", response_model=List[Dict])
async def get_document_folders(user: User = Depends(get_current_user)):
    """Get all document folders as a tree structure."""
    folders = await db.document_folders.find({}, {"_id": 0}).to_list(1000)
    return folders


@router.post("", response_model=Dict)
async def create_document_folder(folder: FolderCreate, user: User = Depends(get_current_user)):
    """Create a new document folder (editors and admins only)."""
    if user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Nur Editoren und Administratoren können Ordner erstellen")
    
    # Check if parent exists
    if folder.parent_id:
        parent = await db.document_folders.find_one({"folder_id": folder.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Übergeordneter Ordner nicht gefunden")
    
    folder_doc = DocumentFolder(
        name=folder.name,
        parent_id=folder.parent_id,
        description=folder.description,
        order=folder.order,
        created_by=user.user_id
    )
    doc = folder_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.document_folders.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/{folder_id}", response_model=Dict)
async def update_document_folder(folder_id: str, update: FolderCreate, user: User = Depends(get_current_user)):
    """Update a document folder."""
    if user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Nur Editoren und Administratoren können Ordner bearbeiten")
    
    # Check if parent exists and prevent circular reference
    if update.parent_id:
        if update.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Ein Ordner kann nicht sein eigener übergeordneter Ordner sein")
        parent = await db.document_folders.find_one({"folder_id": update.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Übergeordneter Ordner nicht gefunden")
    
    result = await db.document_folders.update_one(
        {"folder_id": folder_id},
        {"$set": {
            "name": update.name,
            "parent_id": update.parent_id,
            "description": update.description,
            "order": update.order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ordner nicht gefunden")
    
    folder = await db.document_folders.find_one({"folder_id": folder_id}, {"_id": 0})
    return folder


@router.delete("/{folder_id}")
async def delete_document_folder(folder_id: str, user: User = Depends(get_current_user)):
    """Delete a document folder (admin only). Documents in this folder will be moved to root."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Ordner löschen")
    
    # Check if folder exists
    folder = await db.document_folders.find_one({"folder_id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Ordner nicht gefunden")
    
    # Move child folders to parent
    await db.document_folders.update_many(
        {"parent_id": folder_id},
        {"$set": {"parent_id": folder.get("parent_id")}}
    )
    
    # Move documents in this folder to parent or root
    await db.documents.update_many(
        {"folder_id": folder_id},
        {"$set": {"folder_id": folder.get("parent_id")}}
    )
    
    # Delete the folder
    await db.document_folders.delete_one({"folder_id": folder_id})
    
    return {"message": "Ordner gelöscht"}


@router.get("/{folder_id}/documents")
async def get_folder_documents(folder_id: str, user: User = Depends(get_current_user)):
    """Get all documents in a specific folder."""
    # None or empty string means root folder
    query = {"deleted_at": {"$exists": False}}
    if folder_id and folder_id != "root":
        query["folder_id"] = folder_id
    else:
        query["$or"] = [{"folder_id": None}, {"folder_id": {"$exists": False}}]
    
    docs = await db.documents.find(
        query, 
        {"_id": 0, "temp_path": 0}
    ).sort("created_at", -1).to_list(100)
    return docs
