"""
Google Drive integration routes for CANUSA Nexus.
Allows importing documents from Google Drive and exporting articles to Google Drive.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timezone, timedelta
import os
import io
import logging
import uuid

from database import db
from dependencies import get_current_user
from models import User

router = APIRouter(prefix="/drive", tags=["Google Drive"])
logger = logging.getLogger(__name__)

# Supported file types for import
SUPPORTED_MIME_TYPES = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
}

# Google Docs export types
GOOGLE_DOCS_EXPORT = {
    'application/vnd.google-apps.document': ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'),
    'application/vnd.google-apps.spreadsheet': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'),
}


def get_oauth_config():
    """Get OAuth configuration from environment."""
    return {
        "web": {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def get_redirect_uri(request: Request) -> str:
    """Build redirect URI from request."""
    forwarded_host = request.headers.get('x-forwarded-host')
    forwarded_proto = request.headers.get('x-forwarded-proto', 'https')
    
    if forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        base_url = str(request.base_url).rstrip('/')
        if base_url.startswith('http://') and 'localhost' not in base_url:
            base_url = base_url.replace('http://', 'https://', 1)
    
    return f"{base_url}/api/drive/callback"


@router.get("/connect")
async def connect_drive(request: Request, user: User = Depends(get_current_user)):
    """Initiate Google Drive OAuth flow."""
    try:
        redirect_uri = get_redirect_uri(request)
        
        config = get_oauth_config()
        config["web"]["redirect_uris"] = [redirect_uri]
        
        flow = Flow.from_client_config(
            config,
            scopes=['https://www.googleapis.com/auth/drive'],
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=user.user_id
        )
        
        # Store the code verifier for the callback
        # The flow object generates a code_verifier internally when creating authorization_url
        code_verifier = flow.code_verifier if hasattr(flow, 'code_verifier') else None
        
        # Store pending OAuth state in database
        await db.drive_oauth_state.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "user_id": user.user_id,
                "redirect_uri": redirect_uri,
                "code_verifier": code_verifier,
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Drive OAuth initiated for user {user.user_id}, redirect_uri: {redirect_uri}")
        return {"authorization_url": authorization_url}
    
    except Exception as e:
        logger.error(f"Failed to initiate Drive OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OAuth-Fehler: {str(e)}")


@router.get("/callback")
async def drive_callback(request: Request, code: str = Query(...), state: str = Query(...)):
    """Handle Google Drive OAuth callback."""
    try:
        # Get stored OAuth state
        oauth_state = await db.drive_oauth_state.find_one({"user_id": state})
        if not oauth_state:
            logger.error(f"No OAuth state found for user {state}")
            return RedirectResponse(url="/documents?drive_error=true", status_code=302)
        
        redirect_uri = oauth_state.get("redirect_uri") or get_redirect_uri(request)
        code_verifier = oauth_state.get("code_verifier")
        
        config = get_oauth_config()
        config["web"]["redirect_uris"] = [redirect_uri]
        
        # Don't specify scopes - accept whatever Google returns
        # Google may add openid, userinfo.email, userinfo.profile automatically
        flow = Flow.from_client_config(
            config,
            scopes=None,  # Accept all returned scopes
            redirect_uri=redirect_uri
        )
        
        # Set the code verifier if we have one
        if code_verifier:
            flow.code_verifier = code_verifier
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        logger.info(f"Drive credentials obtained for user {state}, scopes: {credentials.scopes}")
        
        # Store credentials in database
        await db.drive_credentials.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": list(credentials.scopes) if credentials.scopes else [],
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Drive credentials stored for user {state}")
        
        # Clean up OAuth state
        await db.drive_oauth_state.delete_one({"user_id": state})
        
        # Redirect to documents page with success message
        return RedirectResponse(url="/documents?drive_connected=true", status_code=302)
    
    except Exception as e:
        logger.error(f"Drive OAuth callback failed: {str(e)}")
        return RedirectResponse(url="/documents?drive_error=true", status_code=302)


@router.get("/status")
async def drive_status(user: User = Depends(get_current_user)):
    """Check if user has connected Google Drive."""
    creds_doc = await db.drive_credentials.find_one({"user_id": user.user_id}, {"_id": 0, "access_token": 0, "refresh_token": 0, "client_secret": 0})
    
    if not creds_doc:
        return {"connected": False}
    
    return {
        "connected": True,
        "updated_at": creds_doc.get("updated_at")
    }


@router.post("/disconnect")
async def disconnect_drive(user: User = Depends(get_current_user)):
    """Disconnect Google Drive."""
    result = await db.drive_credentials.delete_one({"user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Google Drive nicht verbunden")
    
    logger.info(f"Drive disconnected for user {user.user_id}")
    return {"message": "Google Drive wurde getrennt"}


async def get_drive_service(user: User):
    """Get Google Drive service with auto-refresh credentials."""
    creds_doc = await db.drive_credentials.find_one({"user_id": user.user_id})
    
    if not creds_doc:
        raise HTTPException(
            status_code=400,
            detail="Google Drive nicht verbunden. Bitte verbinden Sie zuerst Ihr Google Drive."
        )
    
    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc.get("scopes")
    )
    
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        logger.info(f"Refreshing expired Drive token for user {user.user_id}")
        creds.refresh(GoogleRequest())
        
        await db.drive_credentials.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "access_token": creds.token,
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return build('drive', 'v3', credentials=creds)


@router.get("/shared-drives")
async def list_shared_drives(user: User = Depends(get_current_user)):
    """List all shared drives the user has access to."""
    try:
        service = await get_drive_service(user)
        
        results = service.drives().list(pageSize=50).execute()
        drives = results.get('drives', [])
        
        return {
            "drives": [{"id": d["id"], "name": d["name"]} for d in drives]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not list shared drives: {e}")
        return {"drives": []}


@router.get("/files")
async def list_drive_files(
    folder_id: str = Query(default="root", description="Folder ID to list"),
    user: User = Depends(get_current_user)
):
    """List files and folders from Google Drive including shared drives."""
    try:
        service = await get_drive_service(user)
        
        # Build query for supported file types
        mime_conditions = [f"mimeType='{mime}'" for mime in SUPPORTED_MIME_TYPES.keys()]
        mime_conditions.extend([f"mimeType='{mime}'" for mime in GOOGLE_DOCS_EXPORT.keys()])
        mime_conditions.append("mimeType='application/vnd.google-apps.folder'")
        
        query = f"'{folder_id}' in parents and trashed=false and ({' or '.join(mime_conditions)})"
        
        results = service.files().list(
            q=query,
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink)",
            orderBy="folder,name",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        
        files = results.get('files', [])
        
        # Separate folders and files
        folders = []
        documents = []
        
        for f in files:
            item = {
                "id": f["id"],
                "name": f["name"],
                "mimeType": f["mimeType"],
                "modifiedTime": f.get("modifiedTime"),
                "iconLink": f.get("iconLink"),
            }
            
            if f["mimeType"] == "application/vnd.google-apps.folder":
                folders.append(item)
            else:
                item["size"] = int(f.get("size", 0)) if f.get("size") else None
                # Mark Google Docs types
                if f["mimeType"] in GOOGLE_DOCS_EXPORT:
                    item["isGoogleDoc"] = True
                    item["exportType"] = GOOGLE_DOCS_EXPORT[f["mimeType"]][1]
                documents.append(item)
        
        return {
            "folder_id": folder_id,
            "folders": folders,
            "files": documents
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list Drive files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden der Dateien: {str(e)}")


@router.get("/folders")
async def list_drive_folders(user: User = Depends(get_current_user)):
    """List all folders from Google Drive for export folder selection including shared drives."""
    try:
        service = await get_drive_service(user)
        
        query = "mimeType='application/vnd.google-apps.folder' and trashed=false"
        
        results = service.files().list(
            q=query,
            pageSize=200,
            fields="files(id, name, parents)",
            orderBy="name",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        
        folders = results.get('files', [])
        
        # Build folder tree
        folder_list = [{"id": "root", "name": "Mein Drive", "parent": None}]
        for f in folders:
            folder_list.append({
                "id": f["id"],
                "name": f["name"],
                "parent": f.get("parents", [None])[0]
            })
        
        # Also get shared drives
        try:
            shared_drives = service.drives().list(pageSize=50).execute()
            for drive in shared_drives.get('drives', []):
                folder_list.append({
                    "id": drive["id"],
                    "name": f"📁 {drive['name']} (Geteilte Ablage)",
                    "parent": None,
                    "isSharedDrive": True
                })
        except Exception as e:
            logger.warning(f"Could not list shared drives: {e}")
        
        return {"folders": folder_list}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list Drive folders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden der Ordner: {str(e)}")


@router.post("/import/{file_id}")
async def import_from_drive(
    file_id: str,
    folder_id: str = Query(default=None, description="Target folder ID in document system"),
    user: User = Depends(get_current_user)
):
    """Import a file from Google Drive into the document system."""
    try:
        service = await get_drive_service(user)
        
        # Get file metadata
        file_meta = service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, size",
            supportsAllDrives=True
        ).execute()
        
        file_name = file_meta["name"]
        mime_type = file_meta["mimeType"]
        
        # Handle Google Docs export
        if mime_type in GOOGLE_DOCS_EXPORT:
            export_mime, extension = GOOGLE_DOCS_EXPORT[mime_type]
            request = service.files().export_media(fileId=file_id, mimeType=export_mime)
            if not file_name.endswith(extension):
                file_name += extension
            mime_type = export_mime
        elif mime_type in SUPPORTED_MIME_TYPES:
            request = service.files().get_media(fileId=file_id)
        else:
            raise HTTPException(status_code=400, detail=f"Dateityp nicht unterstützt: {mime_type}")
        
        # Download file content
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        file_buffer.seek(0)
        file_content = file_buffer.read()
        
        # Create document in database
        from routes.documents import process_document_content
        
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        
        # Store file
        file_path = f"/app/backend/uploads/{doc_id}_{file_name}"
        os.makedirs("/app/backend/uploads", exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Process document content
        structured_content = await process_document_content(file_path, mime_type)
        
        # Determine file type
        file_ext = os.path.splitext(file_name)[1].lower()
        
        document = {
            "document_id": doc_id,
            "filename": file_name,
            "original_filename": file_name,
            "mime_type": mime_type,
            "file_type": file_ext,
            "file_size": len(file_content),
            "file_path": file_path,
            "folder_id": folder_id,
            "uploaded_by": user.user_id,
            "uploaded_by_name": user.name,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "source": "google_drive",
            "drive_file_id": file_id,
            "structured_content": structured_content,
            "extracted_text": structured_content.get("extracted_text", "") if structured_content else "",
            "status": "completed",
            "page_count": structured_content.get("page_count", 1) if structured_content else 1
        }
        
        await db.documents.insert_one(document)
        
        logger.info(f"Imported file {file_name} from Google Drive for user {user.user_id}")
        
        return {
            "doc_id": doc_id,
            "filename": file_name,
            "message": f"Datei '{file_name}' wurde erfolgreich importiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to import from Drive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import-Fehler: {str(e)}")


@router.post("/export/article/{article_id}")
async def export_article_to_drive(
    article_id: str,
    format: str = Query(default="pdf", description="Export format: pdf or docx"),
    folder_id: str = Query(default="root", description="Target folder ID in Google Drive"),
    user: User = Depends(get_current_user)
):
    """Export an article to Google Drive."""
    try:
        # Get article
        article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
        if not article:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        service = await get_drive_service(user)
        
        # Generate export file
        if format == "pdf":
            from routes.exports import generate_pdf_content
            file_content, filename = await generate_pdf_content(article)
            mime_type = "application/pdf"
        elif format == "docx":
            from routes.exports import generate_docx_content
            file_content, filename = await generate_docx_content(article)
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            raise HTTPException(status_code=400, detail="Ungültiges Format. Verwenden Sie 'pdf' oder 'docx'")
        
        # Upload to Google Drive
        file_metadata = {
            "name": filename,
            "parents": [folder_id] if folder_id != "root" else []
        }
        
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True
        )
        
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, name, webViewLink"
        ).execute()
        
        logger.info(f"Exported article {article_id} to Google Drive for user {user.user_id}")
        
        return {
            "file_id": uploaded_file["id"],
            "filename": uploaded_file["name"],
            "webViewLink": uploaded_file.get("webViewLink"),
            "message": f"Artikel wurde erfolgreich nach Google Drive exportiert"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export to Drive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export-Fehler: {str(e)}")
