"""
Backup, export, and import routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime, timezone
import uuid
import os
import re
import json
import io
import zipfile
import logging

from database import db
from models import User
from dependencies import get_current_user, get_password_hash

router = APIRouter(prefix="/backup", tags=["Backup"])
logger = logging.getLogger(__name__)


def json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def strip_html(html_content: str) -> str:
    """Remove HTML tags and convert to plain text."""
    text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'</h[1-6]>', '\n\n', text)
    text = re.sub(r'<li>', '• ', text)
    text = re.sub(r'</li>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = text.strip()
    return text


@router.get("/export")
async def export_backup(user: User = Depends(get_current_user)):
    """Export all data as JSON backup (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Backups erstellen")
    
    articles = await db.articles.find({}, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    documents_meta = await db.documents.find({}, {"_id": 0, "file_path": 0, "temp_path": 0}).to_list(1000)
    
    backup_data = {
        "version": "2.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.email,
        "statistics": {
            "articles": len(articles),
            "categories": len(categories),
            "users": len(users),
            "documents": len(documents_meta)
        },
        "data": {
            "articles": articles,
            "categories": categories,
            "users": users,
            "documents_metadata": documents_meta
        }
    }
    
    json_content = json.dumps(backup_data, ensure_ascii=False, indent=2, default=json_serializer)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"canusa_nexus_backup_{timestamp}.json"
    
    return StreamingResponse(
        io.BytesIO(json_content.encode('utf-8')),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/documents")
async def export_documents_backup(user: User = Depends(get_current_user)):
    """Export all uploaded documents as ZIP backup (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Dokument-Backups erstellen")
    
    documents = await db.documents.find({}, {"_id": 0}).to_list(1000)
    
    if not documents:
        raise HTTPException(status_code=404, detail="Keine Dokumente zum Exportieren vorhanden")
    
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        manifest = {
            "version": "2.0.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.email,
            "documents": []
        }
        
        files_added = 0
        for doc in documents:
            file_path = doc.get("file_path") or doc.get("temp_path")
            
            if file_path and os.path.exists(file_path):
                original_name = doc.get("filename", f"{doc['document_id']}.pdf")
                zip_path = f"documents/{original_name}"
                
                counter = 1
                base_name = original_name.rsplit('.', 1)[0] if '.' in original_name else original_name
                ext = original_name.rsplit('.', 1)[1] if '.' in original_name else 'pdf'
                while zip_path in [info.filename for info in zip_file.filelist]:
                    zip_path = f"documents/{base_name}_{counter}.{ext}"
                    counter += 1
                
                zip_file.write(file_path, zip_path)
                files_added += 1
                
                manifest["documents"].append({
                    "document_id": doc.get("document_id"),
                    "filename": doc.get("filename"),
                    "original_filename": original_name,
                    "zip_path": zip_path,
                    "uploaded_by": doc.get("uploaded_by"),
                    "created_at": doc.get("created_at"),
                    "file_size": doc.get("file_size")
                })
        
        manifest["total_files"] = files_added
        
        manifest_json = json.dumps(manifest, ensure_ascii=False, indent=2, default=json_serializer)
        zip_file.writestr("manifest.json", manifest_json)
    
    if files_added == 0:
        raise HTTPException(status_code=404, detail="Keine Dokument-Dateien gefunden")
    
    zip_buffer.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"canusa_nexus_documents_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/documents/import")
async def import_documents_backup(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Import documents from ZIP backup (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Dokument-Backups importieren")
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Bitte eine ZIP-Datei hochladen")
    
    content = await file.read()
    zip_buffer = io.BytesIO(content)
    
    results = {"imported": 0, "skipped": 0, "errors": 0}
    
    try:
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            os.makedirs("/tmp/pdfs", exist_ok=True)
            
            for file_info in zip_file.filelist:
                if file_info.filename.startswith("documents/") and not file_info.is_dir():
                    original_name = file_info.filename.replace("documents/", "")
                    
                    existing = await db.documents.find_one({"filename": original_name})
                    if existing:
                        results["skipped"] += 1
                        continue
                    
                    try:
                        file_content = zip_file.read(file_info.filename)
                        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
                        file_path = f"/tmp/pdfs/{doc_id}.pdf"
                        
                        with open(file_path, "wb") as f:
                            f.write(file_content)
                        
                        doc_record = {
                            "document_id": doc_id,
                            "filename": original_name,
                            "status": "completed",
                            "file_path": file_path,
                            "file_size": len(file_content),
                            "uploaded_by": user.user_id,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "imported_from_backup": True
                        }
                        
                        await db.documents.insert_one(doc_record)
                        results["imported"] += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to import document {original_name}: {e}")
                        results["errors"] += 1
    
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Ungültige ZIP-Datei")
    
    return {
        "message": "Dokument-Import abgeschlossen",
        "results": results
    }


class BackupImportRequest(BaseModel):
    backup_data: Dict[str, Any]
    import_articles: bool = True
    import_categories: bool = True
    import_users: bool = True
    merge_mode: bool = True


@router.post("/import")
async def import_backup(request: BackupImportRequest, user: User = Depends(get_current_user)):
    """Import data from JSON backup (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Backups wiederherstellen")
    
    backup = request.backup_data
    
    if "data" not in backup:
        raise HTTPException(status_code=400, detail="Ungültiges Backup-Format: 'data' fehlt")
    
    results = {
        "articles": {"imported": 0, "skipped": 0, "errors": 0},
        "categories": {"imported": 0, "skipped": 0, "errors": 0},
        "users": {"imported": 0, "skipped": 0, "errors": 0}
    }
    
    data = backup["data"]
    
    if request.import_categories and "categories" in data:
        for cat in data["categories"]:
            try:
                existing = await db.categories.find_one({"category_id": cat.get("category_id")})
                if existing:
                    if not request.merge_mode:
                        await db.categories.replace_one({"category_id": cat["category_id"]}, cat)
                        results["categories"]["imported"] += 1
                    else:
                        results["categories"]["skipped"] += 1
                else:
                    await db.categories.insert_one(cat)
                    results["categories"]["imported"] += 1
            except Exception as e:
                logger.error(f"Category import error: {e}")
                results["categories"]["errors"] += 1
    
    if request.import_articles and "articles" in data:
        for art in data["articles"]:
            try:
                existing = await db.articles.find_one({"article_id": art.get("article_id")})
                if existing:
                    if not request.merge_mode:
                        await db.articles.replace_one({"article_id": art["article_id"]}, art)
                        results["articles"]["imported"] += 1
                    else:
                        results["articles"]["skipped"] += 1
                else:
                    await db.articles.insert_one(art)
                    results["articles"]["imported"] += 1
            except Exception as e:
                logger.error(f"Article import error: {e}")
                results["articles"]["errors"] += 1
    
    if request.import_users and "users" in data:
        for usr in data["users"]:
            try:
                if usr.get("email"):
                    usr["email"] = usr["email"].lower()
                existing = await db.users.find_one({"email": usr.get("email")})
                if existing:
                    results["users"]["skipped"] += 1
                else:
                    usr["password_hash"] = get_password_hash("TempPassword123!")
                    usr["needs_password_change"] = True
                    await db.users.insert_one(usr)
                    results["users"]["imported"] += 1
            except Exception as e:
                logger.error(f"User import error: {e}")
                results["users"]["errors"] += 1
    
    return {
        "message": "Backup-Import abgeschlossen",
        "results": results,
        "note": "Importierte Benutzer haben das temporäre Passwort 'TempPassword123!' und müssen es ändern."
    }


@router.get("/preview")
async def preview_backup_info(user: User = Depends(get_current_user)):
    """Get current database statistics for backup preview (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren")
    
    return {
        "articles": await db.articles.count_documents({}),
        "categories": await db.categories.count_documents({}),
        "users": await db.users.count_documents({}),
        "documents": await db.documents.count_documents({})
    }
