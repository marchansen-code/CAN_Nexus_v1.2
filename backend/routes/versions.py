"""
Article versioning routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from models import User, ArticleVersion, ArticleVersionResponse
from dependencies import get_current_user

router = APIRouter(prefix="/versions", tags=["Versions"])


@router.get("/articles/{article_id}", response_model=List[ArticleVersionResponse])
async def get_article_versions(article_id: str, user: User = Depends(get_current_user)):
    """Get all versions of an article."""
    # Check if article exists
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Get versions sorted by version number descending
    versions = await db.article_versions.find(
        {"article_id": article_id},
        {"_id": 0, "version_id": 1, "version_number": 1, "created_by_name": 1, 
         "created_at": 1, "change_summary": 1}
    ).sort("version_number", -1).to_list(100)
    
    return versions


@router.get("/articles/{article_id}/{version_id}")
async def get_article_version(article_id: str, version_id: str, user: User = Depends(get_current_user)):
    """Get a specific version of an article."""
    version = await db.article_versions.find_one(
        {"article_id": article_id, "version_id": version_id},
        {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    
    return version


@router.post("/articles/{article_id}/{version_id}/restore")
async def restore_article_version(article_id: str, version_id: str, user: User = Depends(get_current_user)):
    """Restore an article to a previous version."""
    if user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Nur Administratoren und Editoren können Versionen wiederherstellen")
    
    # Get the version
    version = await db.article_versions.find_one(
        {"article_id": article_id, "version_id": version_id},
        {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    
    # Get current article for version creation
    current_article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not current_article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Save current state as a new version before restoring
    await create_article_version(
        article_id=article_id,
        article=current_article,
        user=user,
        change_summary=f"Vor Wiederherstellung von Version {version['version_number']}"
    )
    
    # Restore the article to the selected version
    await db.articles.update_one(
        {"article_id": article_id},
        {"$set": {
            "title": version["title"],
            "content": version["content"],
            "category_ids": version.get("category_ids", []),
            "tags": version.get("tags", []),
            "updated_by": user.user_id,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Create a new version for the restored state
    restored_article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    await create_article_version(
        article_id=article_id,
        article=restored_article,
        user=user,
        change_summary=f"Wiederhergestellt von Version {version['version_number']}"
    )
    
    return {"message": f"Artikel auf Version {version['version_number']} wiederhergestellt"}


async def create_article_version(article_id: str, article: dict, user: User, change_summary: str = None):
    """Create a new version entry for an article."""
    # Get the next version number
    last_version = await db.article_versions.find_one(
        {"article_id": article_id},
        sort=[("version_number", -1)]
    )
    next_version = (last_version.get("version_number", 0) if last_version else 0) + 1
    
    # Get user name
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"name": 1, "_id": 0})
    user_name = user_doc.get("name", "Unbekannt") if user_doc else "Unbekannt"
    
    version = ArticleVersion(
        article_id=article_id,
        version_number=next_version,
        title=article["title"],
        content=article["content"],
        category_ids=article.get("category_ids", []),
        tags=article.get("tags", []),
        status=article.get("status", "draft"),
        created_by=user.user_id,
        created_by_name=user_name,
        change_summary=change_summary
    )
    
    await db.article_versions.insert_one(version.model_dump())
    return version
