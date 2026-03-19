"""
Authentication routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from models import User, LoginRequest
from dependencies import get_current_user, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Setup auth logger for Fail2Ban
auth_logger = logging.getLogger("auth_failures")


@router.post("/login")
async def login(login_data: LoginRequest, response: Response, request: Request):
    """Login with email and password."""
    # Get client IP for logging
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    user = await db.users.find_one({"email": login_data.email.lower()}, {"_id": 0})
    
    if not user:
        auth_logger.warning(f"Failed login attempt from {client_ip} for unknown user: {login_data.email}")
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")
    
    if not verify_password(login_data.password, user.get("password_hash", "")):
        auth_logger.warning(f"Failed login attempt from {client_ip} for user: {login_data.email} (invalid password)")
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")
    
    if user.get("is_blocked", False):
        auth_logger.warning(f"Blocked user login attempt from {client_ip} for user: {login_data.email}")
        raise HTTPException(status_code=403, detail="Ihr Konto wurde gesperrt")
    
    # Create session
    session_token = str(uuid.uuid4())
    days = 30 if login_data.stay_logged_in else 7
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=days * 24 * 60 * 60
    )
    
    # Update last_active timestamp
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
    )
    
    logging.info(f"Successful login from {client_ip} for user: {login_data.email}")
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "is_blocked": user.get("is_blocked", False)
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    # Update last_active timestamp (fire and forget)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
    )
    return user.model_dump()


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session."""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Erfolgreich abgemeldet"}
