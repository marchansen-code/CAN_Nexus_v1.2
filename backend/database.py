"""
Database configuration and connection management.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Default admin credentials
DEFAULT_ADMIN_EMAIL = "marc.hansen@canusa.de"
DEFAULT_ADMIN_PASSWORD = "CanusaNexus2024!"
DEFAULT_ADMIN_NAME = "Marc Hansen"
