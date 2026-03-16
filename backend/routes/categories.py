"""
Category management routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone

from database import db
from models import User, Category, CategoryCreate
from dependencies import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[Dict])
async def get_categories(user: User = Depends(get_current_user)):
    """Get all categories as a tree structure."""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories


@router.post("", response_model=Dict)
async def create_category(category: CategoryCreate, user: User = Depends(get_current_user)):
    """Create a new category."""
    cat_doc = Category(
        name=category.name,
        parent_id=category.parent_id,
        description=category.description,
        order=category.order,
        created_by=user.user_id
    )
    doc = cat_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/{category_id}", response_model=Dict)
async def update_category(category_id: str, update: CategoryCreate, user: User = Depends(get_current_user)):
    """Update a category."""
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {
            "name": update.name,
            "parent_id": update.parent_id,
            "description": update.description,
            "order": update.order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    
    cat = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return cat


@router.delete("/{category_id}")
async def delete_category(category_id: str, user: User = Depends(get_current_user)):
    """Delete a category."""
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Kategorie gelöscht"}
