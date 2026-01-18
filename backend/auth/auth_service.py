# Simple Authentication System
# For production, use proper JWT tokens and secure password hashing

from datetime import datetime, timedelta
from typing import Optional, Dict
from passlib.context import CryptContext
from jose import JWTError, jwt
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

class AuthService:
    """Simple authentication service"""
    
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
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

# Default demo users (for testing)
DEMO_USERS = {
    "shubhrangshub@gmail.com": {
        "id": "user_shubhrang",
        "email": "shubhrangshub@gmail.com",
        "name": "Shubhrang (Admin)",
        "password_hash": pwd_context.hash("admin123"),  # Password: admin123
        "role": "admin",
        "is_active": True
    },
    "admin@qualitystudio.com": {
        "id": "user_admin",
        "email": "admin@qualitystudio.com",
        "name": "Admin User",
        "password_hash": pwd_context.hash("admin123"),  # Password: admin123
        "role": "admin",
        "is_active": True
    },
    "inspector@qualitystudio.com": {
        "id": "user_inspector",
        "email": "inspector@qualitystudio.com",
        "name": "Quality Inspector",
        "password_hash": pwd_context.hash("inspector123"),  # Password: inspector123
        "role": "quality_inspector",
        "is_active": True
    },
    "engineer@qualitystudio.com": {
        "id": "user_engineer",
        "email": "engineer@qualitystudio.com",
        "name": "Quality Engineer",
        "password_hash": pwd_context.hash("engineer123"),  # Password: engineer123
        "role": "quality_engineer",
        "is_active": True
    },
    "sales@qualitystudio.com": {
        "id": "user_sales",
        "email": "sales@qualitystudio.com",
        "name": "Sales Representative",
        "password_hash": pwd_context.hash("sales123"),  # Password: sales123
        "role": "sales",
        "is_active": True
    },
    "operator@qualitystudio.com": {
        "id": "user_operator",
        "email": "operator@qualitystudio.com",
        "name": "Production Operator",
        "password_hash": pwd_context.hash("operator123"),  # Password: operator123
        "role": "operator",
        "is_active": True
    }
}

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user by email and password"""
    user = DEMO_USERS.get(email)
    if not user:
        return None
    if not pwd_context.verify(password, user["password_hash"]):
        return None
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "is_active": user["is_active"]
    }

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID"""
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
