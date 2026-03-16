"""
Pydantic models for the CANUSA Knowledge Hub API.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


# ==================== USER MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = "viewer"
    is_blocked: bool = False
    group_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "viewer"


class RoleUpdate(BaseModel):
    role: str


class PasswordChange(BaseModel):
    new_password: str


class UserGroupUpdate(BaseModel):
    group_ids: List[str]


# ==================== AUTH MODELS ====================

class LoginRequest(BaseModel):
    email: str
    password: str
    stay_logged_in: bool = False


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== GROUP MODELS ====================

class Group(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str = Field(default_factory=lambda: f"grp_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


# ==================== CATEGORY MODELS ====================

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    order: int = 0


# ==================== ARTICLE MODELS ====================

class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    article_id: str = Field(default_factory=lambda: f"art_{uuid.uuid4().hex[:12]}")
    title: str
    content: str
    category_ids: List[str] = []
    status: str = "draft"
    tags: List[str] = []
    source_document_id: Optional[str] = None
    review_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    favorited_by: List[str] = []
    contact_person_id: Optional[str] = None
    visible_to_groups: List[str] = []
    is_important: bool = False
    important_until: Optional[datetime] = None
    comments_enabled: bool = True
    created_by: str
    updated_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    view_count: int = 0


class ArticleCreate(BaseModel):
    title: str
    content: str
    category_ids: List[str] = []
    status: str = "draft"
    tags: List[str] = []
    contact_person_id: Optional[str] = None
    visible_to_groups: List[str] = []
    expiry_date: Optional[datetime] = None
    is_important: bool = False
    important_until: Optional[datetime] = None
    comments_enabled: bool = True


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_ids: Optional[List[str]] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    review_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    contact_person_id: Optional[str] = None
    visible_to_groups: Optional[List[str]] = None
    is_important: Optional[bool] = None
    important_until: Optional[datetime] = None
    comments_enabled: Optional[bool] = None


# ==================== COMMENT MODELS ====================

class Comment(BaseModel):
    comment_id: str = Field(default_factory=lambda: f"cmt_{uuid.uuid4().hex[:12]}")
    article_id: str
    content: str
    author_id: str
    author_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommentCreate(BaseModel):
    content: str


# ==================== DOCUMENT MODELS ====================

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    filename: str
    original_language: Optional[str] = None
    target_language: str = "de"
    status: str = "pending"
    page_count: int = 0
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    structured_content: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None


# ==================== SEARCH MODELS ====================

class SearchResult(BaseModel):
    article_id: str
    title: str
    content_snippet: str
    score: float
    category_name: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    category_id: Optional[str] = None
    tags: List[str] = []
    status: Optional[str] = None


# ==================== BACKUP MODELS ====================

class BackupImportRequest(BaseModel):
    import_categories: bool = True
    import_articles: bool = True
    import_users: bool = False
    import_groups: bool = False
    overwrite_existing: bool = False
