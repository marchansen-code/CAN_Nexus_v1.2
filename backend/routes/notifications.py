"""
Notification routes for CANUSA Nexus.
Handles email notifications for various events.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import re

from database import db
from models import User
from dependencies import get_current_user
from services.email_service import email_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)


class ReviewRequest(BaseModel):
    article_id: str
    reviewer_ids: List[str]


class MentionNotification(BaseModel):
    article_id: str
    mentioned_user_ids: List[str]


@router.post("/review-request")
async def send_review_requests(
    request: ReviewRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Send review requests to selected users and grant them temporary read access."""
    # Get article
    article = await db.articles.find_one({"article_id": request.article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Get requester info
    requester = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1})
    requester_name = requester.get("name", "Unbekannt") if requester else "Unbekannt"
    
    # Get reviewer info and add them to article reviewers
    reviewers_added = []
    for reviewer_id in request.reviewer_ids:
        reviewer = await db.users.find_one({"user_id": reviewer_id}, {"_id": 0, "email": 1, "name": 1})
        if reviewer:
            reviewers_added.append({
                "user_id": reviewer_id,
                "email": reviewer["email"],
                "name": reviewer.get("name", "Unbekannt"),
                "requested_at": datetime.now(timezone.utc).isoformat(),
                "requested_by": user.user_id
            })
            
            # Queue email notification
            background_tasks.add_task(
                email_service.send_review_request,
                reviewer["email"],
                reviewer.get("name", "Unbekannt"),
                requester_name,
                article["title"],
                request.article_id
            )
    
    # Add reviewers to article (grants temporary read access)
    if reviewers_added:
        await db.articles.update_one(
            {"article_id": request.article_id},
            {
                "$addToSet": {
                    "reviewers": {"$each": [r["user_id"] for r in reviewers_added]}
                }
            }
        )
    
    return {
        "message": f"Review-Anfragen an {len(reviewers_added)} Benutzer gesendet",
        "reviewers": reviewers_added
    }


@router.delete("/review-request/{article_id}/{reviewer_id}")
async def remove_reviewer(
    article_id: str,
    reviewer_id: str,
    user: User = Depends(get_current_user)
):
    """Remove a reviewer from an article."""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Only author or admin can remove reviewers
    if user.role != "admin" and article.get("created_by") != user.user_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.articles.update_one(
        {"article_id": article_id},
        {"$pull": {"reviewers": reviewer_id}}
    )
    
    return {"message": "Reviewer entfernt"}


@router.get("/article/{article_id}/reviewers")
async def get_article_reviewers(
    article_id: str,
    user: User = Depends(get_current_user)
):
    """Get list of reviewers for an article."""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0, "reviewers": 1, "created_by": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Only author or admin can see reviewers
    if user.role != "admin" and article.get("created_by") != user.user_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    reviewer_ids = article.get("reviewers", [])
    if not reviewer_ids:
        return {"reviewers": []}
    
    reviewers = await db.users.find(
        {"user_id": {"$in": reviewer_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(100)
    
    return {"reviewers": reviewers}


async def notify_mentions_in_content(
    article_id: str,
    content: str,
    author_user_id: str,
    article_title: str
):
    """Parse content for @@ user mentions and send notifications."""
    # Pattern matches data-user-id in user mention spans
    pattern = r'data-user-id="([^"]+)"'
    mentioned_ids = re.findall(pattern, content)
    
    if not mentioned_ids:
        return
    
    # Remove duplicates
    mentioned_ids = list(set(mentioned_ids))
    
    # Get author name
    author = await db.users.find_one({"user_id": author_user_id}, {"_id": 0, "name": 1})
    author_name = author.get("name", "Unbekannt") if author else "Unbekannt"
    
    # Get mentioned users and send notifications
    for user_id in mentioned_ids:
        if user_id == author_user_id:
            continue  # Don't notify author about their own mentions
        
        mentioned_user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "email": 1, "name": 1, "notification_preferences": 1}
        )
        
        if mentioned_user:
            # Check if user wants mention notifications (default: yes)
            prefs = mentioned_user.get("notification_preferences", {})
            if prefs.get("mentions", True):
                await email_service.send_mention_notification(
                    mentioned_user["email"],
                    mentioned_user.get("name", "Unbekannt"),
                    author_name,
                    article_title,
                    article_id
                )


async def notify_favorite_update(
    article_id: str,
    change_type: str,
    changer_user_id: str
):
    """Notify users who favorited an article about updates."""
    article = await db.articles.find_one(
        {"article_id": article_id},
        {"_id": 0, "title": 1, "favorited_by": 1}
    )
    
    if not article or not article.get("favorited_by"):
        return
    
    # Get changer name
    changer = await db.users.find_one({"user_id": changer_user_id}, {"_id": 0, "name": 1})
    changer_name = changer.get("name", "Unbekannt") if changer else "Unbekannt"
    
    # Get users who favorited and have notifications enabled
    for user_id in article["favorited_by"]:
        if user_id == changer_user_id:
            continue  # Don't notify the person who made the change
        
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "email": 1, "name": 1, "notification_preferences": 1}
        )
        
        if user:
            prefs = user.get("notification_preferences", {})
            if prefs.get("favorite_updates", False):  # Opt-in, default off
                await email_service.send_favorite_update_notification(
                    user["email"],
                    user.get("name", "Unbekannt"),
                    article["title"],
                    article_id,
                    change_type,
                    changer_name
                )


@router.put("/preferences")
async def update_notification_preferences(
    preferences: dict,
    user: User = Depends(get_current_user)
):
    """Update user's notification preferences."""
    valid_keys = ["mentions", "favorite_updates", "reviews", "status_changes"]
    clean_prefs = {k: bool(v) for k, v in preferences.items() if k in valid_keys}
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"notification_preferences": clean_prefs}}
    )
    
    return {"message": "Benachrichtigungseinstellungen aktualisiert", "preferences": clean_prefs}


@router.get("/preferences")
async def get_notification_preferences(user: User = Depends(get_current_user)):
    """Get user's notification preferences."""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "notification_preferences": 1}
    )
    
    # Default preferences
    defaults = {
        "mentions": True,
        "favorite_updates": False,
        "reviews": True,
        "status_changes": True
    }
    
    prefs = user_doc.get("notification_preferences", {}) if user_doc else {}
    
    # Merge with defaults
    return {**defaults, **prefs}


@router.post("/test-email")
async def send_test_email(user: User = Depends(get_current_user)):
    """Send a test email to the current user (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur für Administratoren")
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email": 1, "name": 1})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    # Check if SMTP is configured
    import os
    if not os.environ.get("SMTP_PASSWORD"):
        raise HTTPException(
            status_code=500, 
            detail="SMTP ist nicht konfiguriert. Bitte SMTP-Einstellungen in der Umgebung setzen."
        )
    
    success = await email_service.send_email_async(
        user_doc["email"],
        "CANUSA Nexus - Test-E-Mail",
        f"""
        <h2 style="color: #1e3a5f; margin-top: 0;">Test erfolgreich!</h2>
        <p>Hallo <strong>{user_doc.get('name', 'Administrator')}</strong>,</p>
        <p>Diese E-Mail bestätigt, dass das E-Mail-System von CANUSA Nexus korrekt konfiguriert ist.</p>
        <p>Alle Benachrichtigungen werden nun an diese E-Mail-Adresse gesendet.</p>
        """
    )
    
    if success:
        return {"message": "Test-E-Mail wurde gesendet", "recipient": user_doc["email"]}
    else:
        raise HTTPException(
            status_code=500, 
            detail="E-Mail konnte nicht gesendet werden. Gmail erfordert ein App-spezifisches Passwort. Bitte erstellen Sie ein App-Passwort unter https://myaccount.google.com/apppasswords"
        )
