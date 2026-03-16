"""
Statistics, favorites, and activity routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta

from database import db
from models import User
from dependencies import get_current_user

router = APIRouter(tags=["Statistics"])

# In-memory storage for active editors
active_editors = {}


@router.get("/stats")
async def get_stats(user: User = Depends(get_current_user)):
    """Get dashboard statistics."""
    total_articles = await db.articles.count_documents({})
    published_articles = await db.articles.count_documents({"status": "published"})
    draft_articles = await db.articles.count_documents({"status": "draft"})
    review_articles = await db.articles.count_documents({"status": "review"})
    total_categories = await db.categories.count_documents({})
    total_documents = await db.documents.count_documents({})
    pending_documents = await db.documents.count_documents({"status": "pending"})
    
    recent_articles = await db.articles.find({}, {"_id": 0}).sort("updated_at", -1).limit(5).to_list(5)
    top_articles = await db.articles.find({}, {"_id": 0}).sort("view_count", -1).limit(5).to_list(5)
    
    favorite_articles = await db.articles.find(
        {"favorited_by": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "recently_viewed": 1})
    recently_viewed_ids = user_data.get("recently_viewed", [])[:15] if user_data else []
    recently_viewed = []
    if recently_viewed_ids:
        for article_id in recently_viewed_ids:
            article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
            if article:
                recently_viewed.append(article)
    
    user_articles_count = await db.articles.count_documents({"created_by": user.user_id})
    user_documents_count = await db.documents.count_documents({"uploaded_by": user.user_id})
    
    return {
        "total_articles": total_articles,
        "published_articles": published_articles,
        "draft_articles": draft_articles,
        "review_articles": review_articles,
        "total_categories": total_categories,
        "total_documents": total_documents,
        "pending_documents": pending_documents,
        "recent_articles": recent_articles,
        "top_articles": top_articles,
        "favorite_articles": favorite_articles,
        "recently_viewed": recently_viewed,
        "user_stats": {
            "articles_created": user_articles_count,
            "documents_uploaded": user_documents_count
        }
    }


@router.get("/favorites")
async def get_favorites(user: User = Depends(get_current_user)):
    """Get all favorite articles for current user."""
    articles = await db.articles.find(
        {"favorited_by": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return articles


@router.get("/tags")
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


# ==================== WIDGET API ====================

@router.get("/widget/search")
async def widget_search(q: str, limit: int = 3):
    """Public widget search endpoint."""
    articles = await db.articles.find(
        {
            "status": "published",
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0, "article_id": 1, "title": 1, "summary": 1}
    ).limit(limit).to_list(limit)
    
    return {"results": articles, "query": q}


@router.get("/widget/article/{article_id}")
async def widget_get_article(article_id: str):
    """Public widget article endpoint."""
    article = await db.articles.find_one(
        {"article_id": article_id, "status": "published"},
        {"_id": 0, "article_id": 1, "title": 1, "content": 1, "summary": 1}
    )
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return article
