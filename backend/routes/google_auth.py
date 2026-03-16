"""
Google OAuth authentication routes for the CANUSA Knowledge Hub.
REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime, timezone
import os
import uuid
import logging

from database import db

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])
logger = logging.getLogger(__name__)

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


@router.get("/login")
async def google_login(request: Request):
    """
    Initiate Google OAuth login flow.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    # Get the redirect URI from the request origin
    # Ensure HTTPS is used (request comes through a proxy)
    base_url = str(request.base_url).rstrip('/')
    if base_url.startswith('http://') and 'localhost' not in base_url:
        base_url = base_url.replace('http://', 'https://', 1)
    
    redirect_uri = base_url + '/api/auth/google/callback'
    
    logger.info(f"Starting Google OAuth with redirect_uri: {redirect_uri}")
    
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def google_callback(request: Request, response: Response):
    """
    Handle Google OAuth callback.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Benutzerinformationen konnten nicht abgerufen werden")
        
        email = user_info.get('email')
        name = user_info.get('name', email.split('@')[0])
        picture = user_info.get('picture', '')
        
        logger.info(f"Google OAuth callback for user: {email}")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            # Update existing user with Google info
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "google_id": user_info.get('sub'),
                    "picture": picture,
                    "last_login": datetime.now(timezone.utc).isoformat(),
                    "auth_provider": "google"
                }}
            )
            user_id = existing_user['user_id']
            role = existing_user.get('role', 'viewer')
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "role": "viewer",  # Default role for new Google users
                "google_id": user_info.get('sub'),
                "picture": picture,
                "auth_provider": "google",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login": datetime.now(timezone.utc).isoformat(),
                "is_blocked": False
            }
            await db.users.insert_one(new_user)
            role = "viewer"
            logger.info(f"Created new user via Google OAuth: {email}")
        
        # Create session
        session_token = f"sess_{uuid.uuid4().hex}"
        session = {
            "session_token": session_token,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": datetime.now(timezone.utc).isoformat(),  # Will be handled by frontend
            "auth_provider": "google"
        }
        await db.user_sessions.insert_one(session)
        
        # Set session cookie
        response = RedirectResponse(url="/?google_auth=success", status_code=302)
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400 * 7  # 7 days
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url="/login?error=google_auth_failed", status_code=302)
