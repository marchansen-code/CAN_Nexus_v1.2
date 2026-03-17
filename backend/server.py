"""
CANUSA Nexus Knowledge Hub API
Main application entry point with route registration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import secrets
from datetime import datetime, timezone
import uuid
import logging
from pathlib import Path

# Database and dependencies
from database import db, client, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_NAME
from dependencies import get_password_hash

# Route modules
from routes import auth, users, groups, categories, articles, search, documents, document_folders, recycle_bin, images, stats, backup, exports, versions, google_auth, google_drive, notifications

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure auth failure logger for Fail2Ban
ROOT_DIR = Path(__file__).parent
auth_failure_handler = logging.FileHandler(ROOT_DIR / "auth_failures.log")
auth_failure_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
auth_logger = logging.getLogger("auth_failures")
auth_logger.addHandler(auth_failure_handler)
auth_logger.setLevel(logging.WARNING)

# Create FastAPI app
app = FastAPI(
    title="CANUSA Nexus API",
    description="Knowledge Management Platform for CANUSA",
    version="2.0.0"
)

# Include all routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(document_folders.router, prefix="/api")
app.include_router(recycle_bin.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(backup.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(versions.router, prefix="/api")
app.include_router(google_auth.router, prefix="/api")
app.include_router(google_drive.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

# Session middleware for OAuth (required by authlib)
app.add_middleware(SessionMiddleware, secret_key=secrets.token_urlsafe(32))

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
async def root():
    """API root endpoint."""
    return {"message": "CANUSA Knowledge Hub API", "version": "2.0.0"}


@app.on_event("startup")
async def startup():
    """Initialize database and create default admin."""
    # Create indexes
    await db.articles.create_index([("title", "text"), ("content", "text")])
    await db.articles.create_index("status")
    await db.articles.create_index("category_ids")
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.groups.create_index("name", unique=True)
    await db.article_versions.create_index([("article_id", 1), ("version_number", -1)])
    
    # Check for existing admin user
    admin_exists = await db.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    
    if admin_exists:
        if not admin_exists.get("password_hash"):
            logger.info(f"Migrating admin user {DEFAULT_ADMIN_EMAIL} to password auth...")
            await db.users.update_one(
                {"email": DEFAULT_ADMIN_EMAIL},
                {"$set": {
                    "password_hash": get_password_hash(DEFAULT_ADMIN_PASSWORD),
                    "role": "admin",
                    "is_blocked": False,
                    "group_ids": []
                }}
            )
            logger.info("Admin user migrated successfully")
    else:
        admin_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": DEFAULT_ADMIN_EMAIL,
            "name": DEFAULT_ADMIN_NAME,
            "password_hash": get_password_hash(DEFAULT_ADMIN_PASSWORD),
            "role": "admin",
            "is_blocked": False,
            "group_ids": [],
            "recently_viewed": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Default admin user created: {DEFAULT_ADMIN_EMAIL}")
    
    # Process expired articles and important markings
    await process_expirations()


async def process_expirations():
    """Check for expired articles and important markings."""
    now = datetime.now(timezone.utc).isoformat()
    
    expired = await db.articles.update_many(
        {
            "expiry_date": {"$lte": now, "$ne": None},
            "status": {"$ne": "draft"}
        },
        {"$set": {"status": "draft"}}
    )
    if expired.modified_count > 0:
        logger.info(f"Set {expired.modified_count} expired articles to draft")
    
    important_expired = await db.articles.update_many(
        {
            "important_until": {"$lte": now, "$ne": None},
            "is_important": True
        },
        {"$set": {"is_important": False, "important_until": None}}
    )
    if important_expired.modified_count > 0:
        logger.info(f"Removed important marking from {important_expired.modified_count} articles")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    client.close()
