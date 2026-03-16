"""
Search routes for the CANUSA Knowledge Hub API.
"""
from fastapi import APIRouter, Depends
from typing import Optional, List
from pydantic import BaseModel
import re

from database import db
from models import User
from dependencies import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


class SearchQueryModel(BaseModel):
    query: str
    top_k: int = 10
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None  # Filter by specific tags


@router.post("")
async def search_articles(query: SearchQueryModel, user: User = Depends(get_current_user)):
    """Search articles with keyword matching and optional tag filtering."""
    # Build base query
    mongo_query = {"deleted_at": {"$exists": False}}
    
    # Tag filter - if tags provided, filter by them
    if query.tags and len(query.tags) > 0:
        mongo_query["tags"] = {"$in": query.tags}
    
    # Category filter
    if query.category_id:
        mongo_query["category_ids"] = query.category_id
    
    # If no search query but tags provided, just filter by tags
    if not query.query or len(query.query) < 2:
        if query.tags and len(query.tags) > 0:
            articles = await db.articles.find(mongo_query, {"_id": 0}).sort("updated_at", -1).limit(query.top_k).to_list(query.top_k)
            results = []
            for art in articles:
                category_name = None
                if art.get("category_ids") and len(art["category_ids"]) > 0:
                    cat = await db.categories.find_one({"category_id": art["category_ids"][0]}, {"_id": 0, "name": 1})
                    if cat:
                        category_name = cat["name"]
                
                results.append({
                    "article_id": art["article_id"],
                    "title": art["title"],
                    "content_snippet": art.get("content", "")[:200] + "...",
                    "score": 1.0,
                    "category_name": category_name,
                    "status": art.get("status", "draft"),
                    "updated_at": art.get("updated_at"),
                    "tags": art.get("tags", []),
                    "view_count": art.get("view_count", 0)
                })
            return {"results": results, "query": query.query, "tags": query.tags}
        return {"results": [], "query": query.query}
    
    search_terms = query.query.lower().split()
    
    or_conditions = []
    for term in search_terms:
        or_conditions.extend([
            {"title": {"$regex": term, "$options": "i"}},
            {"content": {"$regex": term, "$options": "i"}},
            {"summary": {"$regex": term, "$options": "i"}},
            {"tags": {"$regex": term, "$options": "i"}}
        ])
    
    mongo_query["$or"] = or_conditions
    
    articles = await db.articles.find(mongo_query, {"_id": 0}).limit(query.top_k * 2).to_list(query.top_k * 2)
    
    results = []
    for art in articles:
        title_lower = art["title"].lower()
        content_lower = art.get("content", "").lower()
        summary_lower = art.get("summary", "").lower()
        tags_str = " ".join(art.get("tags", [])).lower()
        
        score = 0
        for term in search_terms:
            if term in title_lower:
                score += 0.4
            if term in summary_lower:
                score += 0.2
            if term in content_lower:
                score += 0.1
            if term in tags_str:
                score += 0.3  # Tags are important for search
        
        if score == 0:
            continue
        
        snippet = art.get("summary", "")
        if not snippet:
            content = art.get("content", "")
            clean_content = re.sub(r'<[^>]+>', '', content)
            for term in search_terms:
                idx = clean_content.lower().find(term)
                if idx >= 0:
                    start = max(0, idx - 50)
                    end = min(len(clean_content), idx + 150)
                    snippet = "..." + clean_content[start:end].strip() + "..."
                    break
            if not snippet:
                snippet = clean_content[:200] + "..." if len(clean_content) > 200 else clean_content
        
        category_name = None
        if art.get("category_ids") and len(art["category_ids"]) > 0:
            cat = await db.categories.find_one({"category_id": art["category_ids"][0]}, {"_id": 0, "name": 1})
            if cat:
                category_name = cat["name"]
        
        results.append({
            "article_id": art["article_id"],
            "title": art["title"],
            "content_snippet": snippet[:300],
            "score": min(score, 1.0),
            "category_name": category_name,
            "status": art.get("status", "draft"),
            "updated_at": art.get("updated_at"),
            "tags": art.get("tags", []),
            "view_count": art.get("view_count", 0)
        })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return {"results": results[:query.top_k], "query": query.query, "tags": query.tags}


@router.get("/quick")
async def quick_search(q: str, limit: int = 5, user: User = Depends(get_current_user)):
    """Quick search for autocomplete - fast, lightweight results."""
    if not q or len(q) < 2:
        return {"results": []}
    
    articles = await db.articles.find(
        {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "article_id": 1, "title": 1, "summary": 1, "status": 1, "category_id": 1}
    ).limit(limit).to_list(limit)
    
    results = []
    for art in articles:
        category_name = None
        if art.get("category_id"):
            cat = await db.categories.find_one({"category_id": art["category_id"]}, {"_id": 0, "name": 1})
            if cat:
                category_name = cat["name"]
        
        results.append({
            "article_id": art["article_id"],
            "title": art["title"],
            "summary": (art.get("summary") or "")[:100],
            "status": art.get("status", "draft"),
            "category_name": category_name
        })
    
    return {"results": results}
