"""
Recycle bin (Papierkorb) routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import os

from database import db
from models import User
from dependencies import get_current_user

router = APIRouter(prefix="/trash", tags=["Recycle Bin"])


@router.get("")
async def get_trash(user: User = Depends(get_current_user)):
    """Get all soft-deleted items (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können den Papierkorb sehen")
    
    deleted_articles = await db.articles.find(
        {"deleted_at": {"$exists": True}},
        {"_id": 0}
    ).sort("deleted_at", -1).to_list(100)
    
    deleted_documents = await db.documents.find(
        {"deleted_at": {"$exists": True}},
        {"_id": 0, "temp_path": 0}
    ).sort("deleted_at", -1).to_list(100)
    
    now = datetime.now(timezone.utc)
    for art in deleted_articles:
        deleted_at = art.get("deleted_at")
        if deleted_at:
            if isinstance(deleted_at, str):
                deleted_at = datetime.fromisoformat(deleted_at.replace("Z", "+00:00"))
            if deleted_at.tzinfo is None:
                deleted_at = deleted_at.replace(tzinfo=timezone.utc)
            days_left = 30 - (now - deleted_at).days
            art["days_until_permanent_deletion"] = max(0, days_left)
    
    for doc in deleted_documents:
        deleted_at = doc.get("deleted_at")
        if deleted_at:
            if isinstance(deleted_at, str):
                deleted_at = datetime.fromisoformat(deleted_at.replace("Z", "+00:00"))
            if deleted_at.tzinfo is None:
                deleted_at = deleted_at.replace(tzinfo=timezone.utc)
            days_left = 30 - (now - deleted_at).days
            doc["days_until_permanent_deletion"] = max(0, days_left)
    
    return {
        "articles": deleted_articles,
        "documents": deleted_documents
    }


@router.post("/restore/article/{article_id}")
async def restore_article(article_id: str, user: User = Depends(get_current_user)):
    """Restore a soft-deleted article (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Artikel wiederherstellen")
    
    article = await db.articles.find_one({"article_id": article_id, "deleted_at": {"$exists": True}})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht im Papierkorb gefunden")
    
    await db.articles.update_one(
        {"article_id": article_id},
        {"$unset": {"deleted_at": "", "deleted_by": ""}}
    )
    return {"message": "Artikel wiederhergestellt"}


@router.post("/restore/document/{document_id}")
async def restore_document(document_id: str, user: User = Depends(get_current_user)):
    """Restore a soft-deleted document (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Dokumente wiederherstellen")
    
    doc = await db.documents.find_one({"document_id": document_id, "deleted_at": {"$exists": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht im Papierkorb gefunden")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$unset": {"deleted_at": "", "deleted_by": ""}}
    )
    return {"message": "Dokument wiederhergestellt"}


@router.delete("/permanent/article/{article_id}")
async def permanently_delete_article(article_id: str, user: User = Depends(get_current_user)):
    """Permanently delete an article (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können endgültig löschen")
    
    result = await db.articles.delete_one({"article_id": article_id, "deleted_at": {"$exists": True}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht im Papierkorb gefunden")
    return {"message": "Artikel endgültig gelöscht"}


@router.delete("/permanent/document/{document_id}")
async def permanently_delete_document(document_id: str, user: User = Depends(get_current_user)):
    """Permanently delete a document (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können endgültig löschen")
    
    doc = await db.documents.find_one({"document_id": document_id, "deleted_at": {"$exists": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht im Papierkorb gefunden")
    
    file_path = doc.get("file_path") or doc.get("temp_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    
    await db.documents.delete_one({"document_id": document_id})
    return {"message": "Dokument endgültig gelöscht"}


@router.post("/cleanup")
async def cleanup_trash(user: User = Depends(get_current_user)):
    """Auto-delete items older than 30 days (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können den Papierkorb aufräumen")
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
    
    deleted_articles = await db.articles.delete_many({
        "deleted_at": {"$exists": True, "$lt": cutoff_date}
    })
    
    old_docs = await db.documents.find({
        "deleted_at": {"$exists": True, "$lt": cutoff_date}
    }).to_list(100)
    
    for doc in old_docs:
        file_path = doc.get("file_path") or doc.get("temp_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
    
    deleted_documents = await db.documents.delete_many({
        "deleted_at": {"$exists": True, "$lt": cutoff_date}
    })
    
    return {
        "message": "Papierkorb aufgeräumt",
        "deleted_articles": deleted_articles.deleted_count,
        "deleted_documents": deleted_documents.deleted_count
    }
