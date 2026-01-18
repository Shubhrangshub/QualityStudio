# Enhanced Authentication System with MongoDB Support
# Provides JWT-based authentication with proper token validation

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "qualitystudio-secret-key-2026-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# MongoDB connection (will be initialized by server.py)
db = None

def set_database(database):
    """Set the database connection from server.py"""
    global db
    db = database

class AuthService:
    """Authentication service with JWT token management"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def validate_token(token: str) -> tuple[bool, Optional[Dict], Optional[str]]:
        """Validate token and return (is_valid, payload, error_message)"""
        if not token:
            return False, None, "No token provided"
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return False, None, "Token has expired"
            return True, payload, None
        except jwt.ExpiredSignatureError:
            return False, None, "Token has expired"
        except jwt.InvalidTokenError as e:
            return False, None, f"Invalid token: {str(e)}"

# Default demo users (for testing - also stored in memory for quick access)
DEMO_USERS = {
    "shubhrangshub@gmail.com": {
        "id": "user_shubhrangshu",
        "email": "shubhrangshub@gmail.com",
        "name": "Shubhrangshu",
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "is_active": True
    },
    "admin@qualitystudio.com": {
        "id": "user_admin",
        "email": "admin@qualitystudio.com",
        "name": "Admin User",
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "is_active": True
    },
    "inspector@qualitystudio.com": {
        "id": "user_inspector",
        "email": "inspector@qualitystudio.com",
        "name": "Quality Inspector",
        "password_hash": pwd_context.hash("inspector123"),
        "role": "quality_inspector",
        "is_active": True
    },
    "engineer@qualitystudio.com": {
        "id": "user_engineer",
        "email": "engineer@qualitystudio.com",
        "name": "Quality Engineer",
        "password_hash": pwd_context.hash("engineer123"),
        "role": "quality_engineer",
        "is_active": True
    },
    "sales@qualitystudio.com": {
        "id": "user_sales",
        "email": "sales@qualitystudio.com",
        "name": "Sales Representative",
        "password_hash": pwd_context.hash("sales123"),
        "role": "sales",
        "is_active": True
    },
    "operator@qualitystudio.com": {
        "id": "user_operator",
        "email": "operator@qualitystudio.com",
        "name": "Production Operator",
        "password_hash": pwd_context.hash("operator123"),
        "role": "operator",
        "is_active": True
    }
}

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user by email and password"""
    # First check demo users
    user = DEMO_USERS.get(email)
    if user:
        if pwd_context.verify(password, user["password_hash"]):
            return {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "is_active": user["is_active"]
            }
    return None

async def authenticate_user_async(email: str, password: str) -> Optional[Dict]:
    """Authenticate user - check both demo users and MongoDB"""
    # First check demo users (faster)
    user = DEMO_USERS.get(email)
    if user:
        if pwd_context.verify(password, user["password_hash"]):
            return {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "is_active": user["is_active"]
            }
    
    # Then check MongoDB users
    if db is not None:
        mongo_user = await db.users.find_one({"email": email})
        if mongo_user and "password_hash" in mongo_user:
            if pwd_context.verify(password, mongo_user["password_hash"]):
                return {
                    "id": str(mongo_user["_id"]),
                    "email": mongo_user["email"],
                    "name": mongo_user.get("name", email.split("@")[0]),
                    "role": mongo_user.get("role", "operator"),
                    "is_active": mongo_user.get("is_active", True)
                }
    
    return None

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID from demo users"""
    for user in DEMO_USERS.values():
        if user["id"] == user_id:
            return {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "is_active": user["is_active"]
            }
    return None

async def get_user_by_id_async(user_id: str) -> Optional[Dict]:
    """Get user by ID - check both demo users and MongoDB"""
    # First check demo users
    for user in DEMO_USERS.values():
        if user["id"] == user_id:
            return {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "is_active": user["is_active"]
            }
    
    # Then check MongoDB
    if db is not None:
        try:
            mongo_user = await db.users.find_one({"_id": ObjectId(user_id)})
            if mongo_user:
                return {
                    "id": str(mongo_user["_id"]),
                    "email": mongo_user["email"],
                    "name": mongo_user.get("name", ""),
                    "role": mongo_user.get("role", "operator"),
                    "is_active": mongo_user.get("is_active", True)
                }
        except:
            pass
    
    return None

async def create_user(email: str, password: str, name: str, role: str = "operator") -> Optional[Dict]:
    """Create a new user in MongoDB"""
    if db is None:
        return None
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        return None
    
    user_doc = {
        "email": email,
        "password_hash": pwd_context.hash(password),
        "name": name,
        "role": role,
        "is_active": True,
        "created_date": datetime.now(timezone.utc),
        "updated_date": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    
    return {
        "id": str(result.inserted_id),
        "email": email,
        "name": name,
        "role": role,
        "is_active": True
    }
