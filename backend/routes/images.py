"""
Image upload routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import Response
from datetime import datetime, timezone
import uuid
import os

from database import db
from models import User
from dependencies import get_current_user

router = APIRouter(prefix="/images", tags=["Images"])


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload an image for use in articles."""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Nur Bilder sind erlaubt (JPEG, PNG, GIF, WebP)")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bild darf maximal 10MB groß sein")
    
    images_dir = "/tmp/images"
    os.makedirs(images_dir, exist_ok=True)
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    filename = f"{image_id}.{ext}"
    file_path = f"{images_dir}/{filename}"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    image_doc = {
        "image_id": image_id,
        "filename": filename,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "file_path": file_path,
        "uploaded_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.images.insert_one(image_doc)
    
    return {
        "image_id": image_id,
        "url": f"/api/images/{image_id}",
        "filename": file.filename
    }


@router.get("/{image_id}")
async def get_image(image_id: str):
    """Serve an uploaded image."""
    image_doc = await db.images.find_one({"image_id": image_id})
    if not image_doc:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    
    file_path = image_doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Bilddatei nicht gefunden")
    
    with open(file_path, "rb") as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type=image_doc.get("content_type", "image/jpeg"),
        headers={
            "Cache-Control": "public, max-age=31536000",
            "Content-Disposition": f"inline; filename=\"{image_doc.get('original_filename', 'image')}\""
        }
    )
