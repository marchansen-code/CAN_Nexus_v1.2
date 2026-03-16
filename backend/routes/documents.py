"""
Document upload and processing routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import Dict, List
from datetime import datetime, timezone
import asyncio
import uuid
import os
import logging
import pdfplumber

from database import db
from models import User, Document
from dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    target_language: str = "de",
    folder_id: str = None,
    force: bool = False,
    user: User = Depends(get_current_user)
):
    """Upload a PDF document for processing."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Nur PDF-Dateien sind erlaubt")
    
    existing_doc = await db.documents.find_one({"filename": file.filename})
    if existing_doc and not force:
        raise HTTPException(
            status_code=409, 
            detail=f"Eine Datei mit dem Namen '{file.filename}' existiert bereits."
        )
    
    if existing_doc and force:
        old_path = existing_doc.get("file_path")
        if old_path and os.path.exists(old_path):
            os.remove(old_path)
        await db.documents.delete_one({"document_id": existing_doc["document_id"]})
    
    # Verify folder exists if provided
    if folder_id:
        folder = await db.document_folders.find_one({"folder_id": folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Ordner nicht gefunden")
    
    content = await file.read()
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    permanent_path = f"/tmp/pdfs/{doc_id}.pdf"
    
    os.makedirs("/tmp/pdfs", exist_ok=True)
    
    with open(permanent_path, "wb") as f:
        f.write(content)
    
    doc = Document(
        document_id=doc_id,
        filename=file.filename,
        target_language=target_language,
        status="pending",
        uploaded_by=user.user_id
    )
    doc_dict = doc.model_dump()
    doc_dict["created_at"] = doc_dict["created_at"].isoformat()
    doc_dict["file_path"] = permanent_path
    doc_dict["file_size"] = len(content)
    doc_dict["folder_id"] = folder_id
    
    await db.documents.insert_one(doc_dict)
    
    asyncio.create_task(process_document(doc_id, permanent_path, target_language))
    
    return {
        "document_id": doc_id,
        "filename": doc.filename,
        "folder_id": folder_id,
        "status": "pending",
        "message": "Dokument wird verarbeitet"
    }


async def process_document(document_id: str, file_path: str, target_language: str):
    """Process PDF document: extract text and tables."""
    try:
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "processing"}}
        )
        
        extracted_text = ""
        html_content = ""
        page_count = 0
        extracted_tables = []
        
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for page_num, page in enumerate(pdf.pages, 1):
                html_content += f"<div class='pdf-page' data-page='{page_num}'>"
                
                text = page.extract_text()
                if text:
                    extracted_text += f"--- Seite {page_num} ---\n{text}\n\n"
                    paragraphs = text.split('\n\n')
                    for para in paragraphs:
                        if para.strip():
                            if len(para.strip()) < 100 and para.strip().isupper():
                                html_content += f"<h3>{para.strip()}</h3>"
                            else:
                                html_content += f"<p>{para.strip()}</p>"
                
                tables = page.extract_tables()
                for table_idx, table in enumerate(tables):
                    if table and len(table) > 0:
                        table_html = "<table class='w-full border-collapse my-4 text-sm'>"
                        for row_idx, row in enumerate(table):
                            if row:
                                table_html += "<tr>"
                                for cell in row:
                                    cell_content = cell if cell else ""
                                    if row_idx == 0:
                                        table_html += f"<th class='border border-slate-400 bg-slate-100 p-2 font-semibold text-left'>{cell_content}</th>"
                                    else:
                                        table_html += f"<td class='border border-slate-300 p-2'>{cell_content}</td>"
                                table_html += "</tr>"
                        table_html += "</table>"
                        extracted_tables.append({
                            "page": page_num,
                            "index": table_idx,
                            "html": table_html
                        })
                        html_content += table_html
                
                html_content += "</div>"
        
        if not extracted_text.strip():
            raise Exception("Kein Text konnte aus dem PDF extrahiert werden")
        
        structured_content = {
            "headlines": [],
            "bulletpoints": [],
            "tables": extracted_tables,
            "images": [],
            "html_content": html_content
        }
        
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": "completed",
                "page_count": page_count,
                "extracted_text": extracted_text,
                "structured_content": structured_content,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Document {document_id} processed successfully")
        
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": "failed",
                "error_message": str(e)
            }}
        )


@router.get("", response_model=List[Dict])
async def get_documents(user: User = Depends(get_current_user)):
    """Get all documents (excluding soft-deleted)."""
    docs = await db.documents.find(
        {"deleted_at": {"$exists": False}}, 
        {"_id": 0, "temp_path": 0}
    ).sort("created_at", -1).to_list(100)
    return docs


@router.get("/{document_id}", response_model=Dict)
async def get_document(document_id: str, user: User = Depends(get_current_user)):
    """Get document details."""
    doc = await db.documents.find_one(
        {"document_id": document_id, "deleted_at": {"$exists": False}}, 
        {"_id": 0, "temp_path": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return doc


@router.delete("/{document_id}")
async def delete_document(document_id: str, user: User = Depends(get_current_user)):
    """Soft delete a document - moves to trash for 30 days (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Dokumente löschen")
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": user.user_id
        }}
    )
    return {"message": "Dokument in Papierkorb verschoben"}


@router.put("/{document_id}/move")
async def move_document(document_id: str, folder_id: str = None, user: User = Depends(get_current_user)):
    """Move a document to a different folder."""
    if user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Nur Editoren und Administratoren können Dokumente verschieben")
    
    doc = await db.documents.find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    # Verify folder exists if provided
    if folder_id:
        folder = await db.document_folders.find_one({"folder_id": folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Ordner nicht gefunden")
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {"folder_id": folder_id}}
    )
    
    return {"message": "Dokument verschoben", "folder_id": folder_id}
