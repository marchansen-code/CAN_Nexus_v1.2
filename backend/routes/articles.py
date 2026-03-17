"""
Article management routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime, timezone
import re

from database import db
from models import User, Article, ArticleCreate, ArticleUpdate, Comment, CommentCreate, SearchQuery, ArticleVersion
from dependencies import get_current_user

router = APIRouter(prefix="/articles", tags=["Articles"])


def can_user_see_article(article: dict, user: User, user_groups: List[str]) -> bool:
    """Check if user can see the article based on status, groups, reviewers, etc."""
    if user.role == "admin":
        return True
    
    if article.get("status") == "draft":
        # Author can always see their own drafts
        if article.get("created_by") == user.user_id:
            return True
        # Reviewers can see drafts they were invited to review
        if user.user_id in article.get("reviewers", []):
            return True
        return False
    
    visible_groups = article.get("visible_to_groups", [])
    if visible_groups:
        if not any(g in user_groups for g in visible_groups):
            return False
    
    return True


@router.get("", response_model=List[Dict])
async def get_articles(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get all articles with optional filtering, respecting visibility rules."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"group_ids": 1})
    user_groups = user_doc.get("group_ids", []) if user_doc else []
    
    query = {"deleted_at": {"$exists": False}}
    if status:
        query["status"] = status
    if category_id:
        query["category_ids"] = category_id
    
    articles = await db.articles.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    filtered = []
    for art in articles:
        if user.role == "admin":
            filtered.append(art)
            continue
        
        if art.get("status") == "draft":
            # Author or reviewer can see draft
            if art.get("created_by") == user.user_id or user.user_id in art.get("reviewers", []):
                filtered.append(art)
            continue
        
        visible_groups = art.get("visible_to_groups", [])
        if visible_groups:
            if any(g in user_groups for g in visible_groups):
                filtered.append(art)
        else:
            filtered.append(art)
    
    return filtered


@router.get("/top-viewed")
async def get_top_viewed_articles(limit: int = 10, user: User = Depends(get_current_user)):
    """Get top viewed articles (published only, not deleted)."""
    articles = await db.articles.find(
        {"status": "published", "deleted_at": {"$exists": False}},
        {"_id": 0}
    ).sort("view_count", -1).limit(limit).to_list(limit)
    return articles


@router.get("/by-category/{category_id}")
async def get_articles_by_category(category_id: str, user: User = Depends(get_current_user)):
    """Get articles in a specific category."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"group_ids": 1})
    user_groups = user_doc.get("group_ids", []) if user_doc else []
    
    articles = await db.articles.find(
        {"category_ids": category_id, "deleted_at": {"$exists": False}},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    filtered = []
    for art in articles:
        if user.role == "admin":
            filtered.append(art)
            continue
        if art.get("status") == "draft" and art.get("created_by") != user.user_id:
            continue
        visible_groups = art.get("visible_to_groups", [])
        if visible_groups and not any(g in user_groups for g in visible_groups):
            continue
        filtered.append(art)
    
    return filtered


@router.get("/search/linkable")
async def search_linkable_articles(q: str, limit: int = 10, user: User = Depends(get_current_user)):
    """Search articles for linking (@ mentions)."""
    if not q or len(q) < 2:
        return {"results": []}
    
    articles = await db.articles.find(
        {"title": {"$regex": q, "$options": "i"}},
        {"_id": 0, "article_id": 1, "title": 1, "status": 1}
    ).limit(limit).to_list(limit)
    
    return {"results": articles}


@router.get("/{article_id}", response_model=Dict)
async def get_article(article_id: str, user: User = Depends(get_current_user)):
    """Get a single article."""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"group_ids": 1})
    user_groups = user_doc.get("group_ids", []) if user_doc else []
    
    if user.role != "admin":
        if article.get("status") == "draft":
            # Allow author or reviewer to see draft
            if article.get("created_by") != user.user_id and user.user_id not in article.get("reviewers", []):
                raise HTTPException(status_code=403, detail="Zugriff verweigert")
        visible_groups = article.get("visible_to_groups", [])
        if visible_groups and not any(g in user_groups for g in visible_groups):
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
    
    return article


@router.post("", response_model=Dict)
async def create_article(article: ArticleCreate, user: User = Depends(get_current_user)):
    """Create a new article."""
    art_doc = Article(
        title=article.title,
        content=article.content,
        category_ids=article.category_ids,
        status=article.status,
        tags=article.tags,
        contact_person_id=article.contact_person_id,
        visible_to_groups=article.visible_to_groups,
        expiry_date=article.expiry_date,
        is_important=article.is_important,
        important_until=article.important_until,
        comments_enabled=article.comments_enabled,
        created_by=user.user_id,
        updated_by=user.user_id
    )
    doc = art_doc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if doc.get("review_date"):
        doc["review_date"] = doc["review_date"].isoformat()
    if doc.get("expiry_date"):
        doc["expiry_date"] = doc["expiry_date"].isoformat()
    if doc.get("important_until"):
        doc["important_until"] = doc["important_until"].isoformat()
    
    await db.articles.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/{article_id}", response_model=Dict)
async def update_article(
    article_id: str, 
    update: ArticleUpdate, 
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Update an article and create a version snapshot."""
    from routes.notifications import notify_mentions_in_content, notify_favorite_update
    from services.email_service import email_service
    
    # Get current article before update
    current_article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not current_article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Create a version of the current state before updating
    await create_article_version(article_id, current_article, user)
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_by"] = user.user_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for date_field in ["review_date", "expiry_date", "important_until"]:
        if update_data.get(date_field):
            update_data[date_field] = update_data[date_field].isoformat()
    
    result = await db.articles.update_one(
        {"article_id": article_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    
    # Check for new mentions and send notifications
    if update.content and update.content != current_article.get("content"):
        background_tasks.add_task(
            notify_mentions_in_content,
            article_id,
            update.content,
            user.user_id,
            article["title"]
        )
        # Notify users who favorited this article
        background_tasks.add_task(
            notify_favorite_update,
            article_id,
            "content",
            user.user_id
        )
    
    # Check for contact person change
    if update.contact_person_id and update.contact_person_id != current_article.get("contact_person_id"):
        # Only notify if new contact person is not the author
        if update.contact_person_id != current_article.get("created_by"):
            new_contact = await db.users.find_one(
                {"user_id": update.contact_person_id},
                {"_id": 0, "email": 1, "name": 1, "notification_preferences": 1}
            )
            if new_contact:
                prefs = new_contact.get("notification_preferences", {})
                if prefs.get("status_changes", True):
                    # Get assigner name
                    assigner = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1})
                    assigner_name = assigner.get("name", "Unbekannt") if assigner else "Unbekannt"
                    
                    background_tasks.add_task(
                        email_service.send_contact_person_notification,
                        new_contact["email"],
                        new_contact.get("name", "Unbekannt"),
                        article["title"],
                        article_id,
                        assigner_name
                    )
    
    return article


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
    
    version_doc = version.model_dump()
    version_doc["created_at"] = version_doc["created_at"].isoformat()
    await db.article_versions.insert_one(version_doc)
    
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    return article


@router.delete("/{article_id}")
async def delete_article(article_id: str, user: User = Depends(get_current_user)):
    """Soft delete an article - moves to trash for 30 days."""
    article = await db.articles.find_one({"article_id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    await db.articles.update_one(
        {"article_id": article_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": user.user_id
        }}
    )
    return {"message": "Artikel in Papierkorb verschoben"}


# ==================== COMMENTS ====================

@router.get("/{article_id}/comments")
async def get_article_comments(article_id: str, user: User = Depends(get_current_user)):
    """Get all comments for an article."""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0, "comments_enabled": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    if not article.get("comments_enabled", True):
        return {"comments": [], "comments_enabled": False}
    
    comments = await db.comments.find(
        {"article_id": article_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"comments": comments, "comments_enabled": True}


@router.post("/{article_id}/comments")
async def create_comment(
    article_id: str, 
    comment_data: CommentCreate, 
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Create a comment on an article."""
    from routes.notifications import notify_favorite_update
    
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0, "comments_enabled": 1, "status": 1, "title": 1, "favorited_by": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    if not article.get("comments_enabled", True):
        raise HTTPException(status_code=403, detail="Kommentare sind für diesen Artikel deaktiviert")
    
    if article.get("status") != "published":
        raise HTTPException(status_code=403, detail="Kommentare nur für veröffentlichte Artikel möglich")
    
    if not comment_data.content or len(comment_data.content.strip()) < 1:
        raise HTTPException(status_code=400, detail="Kommentar darf nicht leer sein")
    
    comment = Comment(
        article_id=article_id,
        content=comment_data.content.strip(),
        author_id=user.user_id,
        author_name=user.name
    )
    
    await db.comments.insert_one(comment.model_dump())
    
    # Notify users who favorited this article about new comment
    if article.get("favorited_by"):
        background_tasks.add_task(
            notify_favorite_update,
            article_id,
            "comment",
            user.user_id
        )
    
    return {"message": "Kommentar erstellt", "comment": comment.model_dump()}


@router.delete("/{article_id}/comments/{comment_id}")
async def delete_comment(article_id: str, comment_id: str, user: User = Depends(get_current_user)):
    """Delete a comment (admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren können Kommentare löschen")
    
    result = await db.comments.delete_one({"comment_id": comment_id, "article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kommentar nicht gefunden")
    
    return {"message": "Kommentar gelöscht"}


# ==================== TAGS ====================

@router.get("/tags", name="get_all_tags_redirect")
async def get_all_tags(user: User = Depends(get_current_user)):
    """Get all unique tags from articles."""
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$sort": {"_id": 1}}
    ]
    result = await db.articles.aggregate(pipeline).to_list(500)
    tags = [r["_id"] for r in result if r["_id"]]
    return {"tags": tags}


# ==================== ANALYTICS ====================

@router.get("/{article_id}/analytics")
async def get_article_analytics(article_id: str, user: User = Depends(get_current_user)):
    """Get analytics for an article (author and admin only)."""
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Check permission: only author or admin can view analytics
    if user.role != "admin" and article.get("created_by") != user.user_id:
        raise HTTPException(status_code=403, detail="Nur der Autor oder Administratoren können die Statistiken sehen")
    
    # Get author info
    author_name = "Unbekannt"
    if article.get("created_by"):
        author = await db.users.find_one({"user_id": article["created_by"]}, {"_id": 0, "name": 1})
        if author:
            author_name = author["name"]
    
    # Get comments count
    comments_count = await db.comments.count_documents({"article_id": article_id})
    
    # Get favorites count
    favorites_count = len(article.get("favorited_by", []))
    
    # Calculate engagement score (0-100)
    view_count = article.get("view_count", 0)
    engagement_score = min(100, (view_count * 2) + (favorites_count * 10) + (comments_count * 5))
    
    # Get view trend (compare to average)
    all_articles_pipeline = [
        {"$match": {"deleted_at": {"$exists": False}}},
        {"$group": {"_id": None, "avg_views": {"$avg": "$view_count"}}}
    ]
    avg_result = await db.articles.aggregate(all_articles_pipeline).to_list(1)
    avg_views = avg_result[0]["avg_views"] if avg_result else 0
    
    trend = "neutral"
    if view_count > avg_views * 1.5:
        trend = "above_average"
    elif view_count < avg_views * 0.5:
        trend = "below_average"
    
    # Get category names
    category_names = []
    for cat_id in article.get("category_ids", []):
        cat = await db.categories.find_one({"category_id": cat_id}, {"_id": 0, "name": 1})
        if cat:
            category_names.append(cat["name"])
    
    return {
        "article_id": article_id,
        "title": article["title"],
        "status": article.get("status", "draft"),
        "author_name": author_name,
        "created_at": article.get("created_at"),
        "updated_at": article.get("updated_at"),
        "categories": category_names,
        "tags": article.get("tags", []),
        "metrics": {
            "view_count": view_count,
            "favorites_count": favorites_count,
            "comments_count": comments_count,
            "engagement_score": engagement_score
        },
        "comparison": {
            "average_views": round(avg_views, 1),
            "trend": trend,
            "percentile": round((view_count / max(avg_views, 1)) * 100, 1) if avg_views > 0 else 100
        },
        "is_important": article.get("is_important", False),
        "comments_enabled": article.get("comments_enabled", True)
    }
