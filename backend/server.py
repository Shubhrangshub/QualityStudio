from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.auth_service import (
    AuthService, authenticate_user, get_user_by_id, DEMO_USERS,
    authenticate_user_async, get_user_by_id_async, create_user, set_database
)
from auth.permissions import User, Role, Permission, check_permission, ROLE_DESCRIPTIONS
from bson import ObjectId

load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Quality Studio API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "quality_studio")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Set database for auth service
set_database(db)

# Security
security = HTTPBearer(auto_error=False)

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Get current user from token (optional - returns None if no token)"""
    if not credentials:
        return None
    
    token = credentials.credentials
    is_valid, payload, error = AuthService.validate_token(token)
    
    if not is_valid:
        return None
    
    user_id = payload.get("sub")
    user = await get_user_by_id_async(user_id)
    return user

async def get_current_user_required(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current user from token (required - raises 401 if no valid token)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    is_valid, payload, error = AuthService.validate_token(token)
    
    if not is_valid:
        raise HTTPException(status_code=401, detail=error or "Invalid token")
    
    user_id = payload.get("sub")
    user = await get_user_by_id_async(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    return user

def require_role(*roles):
    """Dependency that requires user to have one of the specified roles"""
    async def role_checker(current_user: Dict = Depends(get_current_user_required)):
        user_role = current_user.get("role", "")
        if user_role not in roles and "admin" not in roles:
            # Admins always have access
            if user_role != "admin":
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied. Required role: {', '.join(roles)}"
                )
        return current_user
    return role_checker

# Base Model
class BaseDBModel(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}

# Entity Models
class CustomerComplaint(BaseDBModel):
    ticketNumber: Optional[str] = None
    dateLogged: Optional[datetime] = None
    customerName: Optional[str] = None
    productType: Optional[str] = None
    complaintDescription: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = "pending_qfir"
    assignedTo: Optional[str] = None
    qfirCompleted: Optional[bool] = False
    qfirData: Optional[Dict[str, Any]] = None

class DefectTicket(BaseDBModel):
    ticketId: Optional[str] = None
    dateTime: Optional[datetime] = None
    line: Optional[str] = None
    lane: Optional[str] = None
    webPositionMD: Optional[str] = None
    webPositionCD: Optional[str] = None
    shift: Optional[str] = None
    defectType: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = "open"
    inspectionMethod: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = []
    linkedComplaintId: Optional[str] = None
    rootCause: Optional[str] = None

class RCARecord(BaseDBModel):
    defectTicketId: Optional[str] = None
    analysisType: Optional[str] = None
    ishikawaData: Optional[Dict[str, Any]] = None
    fiveWhysData: Optional[List[Dict[str, str]]] = []
    rootCause: Optional[str] = None
    contributingFactors: Optional[List[str]] = []
    evidence: Optional[List[Dict[str, Any]]] = []
    aiSuggestions: Optional[List[str]] = []
    status: Optional[str] = "in_progress"

class CAPAPlan(BaseDBModel):
    defectTicketId: Optional[str] = None
    rcaRecordId: Optional[str] = None
    correctiveActions: Optional[List[Dict[str, Any]]] = []
    preventiveActions: Optional[List[Dict[str, Any]]] = []
    approvalState: Optional[str] = "draft"
    effectiveness: Optional[Dict[str, Any]] = None
    fmeaData: Optional[Dict[str, Any]] = None

class ProcessRun(BaseDBModel):
    runId: Optional[str] = None
    dateTimeStart: Optional[datetime] = None
    dateTimeEnd: Optional[datetime] = None
    line: Optional[str] = None
    materialType: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}
    qualityMetrics: Optional[Dict[str, Any]] = {}

class GoldenBatch(BaseDBModel):
    batchId: Optional[str] = None
    name: Optional[str] = None
    line: Optional[str] = None
    materialType: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}
    qualityMetrics: Optional[Dict[str, Any]] = {}
    dateCreated: Optional[datetime] = None
    isActive: Optional[bool] = True

class SOP(BaseDBModel):
    sopNumber: Optional[str] = None
    title: Optional[str] = None
    version: Optional[str] = None
    department: Optional[str] = None
    content: Optional[str] = None
    effectiveDate: Optional[datetime] = None
    status: Optional[str] = "active"

class DoE(BaseDBModel):
    experimentName: Optional[str] = None
    objective: Optional[str] = None
    factors: Optional[List[Dict[str, Any]]] = []
    runs: Optional[List[Dict[str, Any]]] = []
    results: Optional[Dict[str, Any]] = None
    status: Optional[str] = "planned"

class KnowledgeDocument(BaseDBModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    relatedDefects: Optional[List[str]] = []
    author: Optional[str] = None

class Equipment(BaseDBModel):
    equipmentId: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    line: Optional[str] = None
    status: Optional[str] = "operational"
    maintenanceHistory: Optional[List[Dict[str, Any]]] = []

class FileUploadHistory(BaseDBModel):
    fileName: Optional[str] = None
    fileType: Optional[str] = None
    uploadDate: Optional[datetime] = None
    uploadedBy: Optional[str] = None
    fileSize: Optional[int] = None
    status: Optional[str] = "completed"

class KPI(BaseDBModel):
    recordDate: Optional[datetime] = None
    cpk: Optional[float] = None
    firstPassYield: Optional[float] = None
    defectPPM: Optional[float] = None
    onTimeCAPA: Optional[float] = None
    scrapRate: Optional[float] = None
    customerComplaints: Optional[int] = 0

# Helper functions
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict, excluding _id"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

async def get_items(collection_name: str, sort_by: str = None, limit: int = 100):
    """Get all items from collection"""
    if sort_by and sort_by.startswith("-"):
        sort_order = [(sort_by[1:], -1)]
    elif sort_by:
        sort_order = [(sort_by, 1)]
    else:
        sort_order = [("created_date", -1)]
    
    cursor = db[collection_name].find({}).sort(sort_order).limit(limit)
    items = await cursor.to_list(length=limit)
    return [serialize_doc(item) for item in items]

async def get_item_by_id(collection_name: str, item_id: str):
    """Get single item by ID"""
    try:
        item = await db[collection_name].find_one({"_id": ObjectId(item_id)})
        return serialize_doc(item)
    except:
        return None

async def create_item(collection_name: str, item_data: dict):
    """Create a new item in collection"""
    item_data["created_date"] = datetime.utcnow()
    item_data["updated_date"] = datetime.utcnow()
    # Remove id field if present
    item_data.pop("id", None)
    item_data.pop("_id", None)
    result = await db[collection_name].insert_one(item_data)
    created_item = await db[collection_name].find_one({"_id": result.inserted_id})
    return serialize_doc(created_item)

async def update_item(collection_name: str, item_id: str, update_data: dict):
    """Update an item"""
    update_data["updated_date"] = datetime.utcnow()
    update_data.pop("id", None)
    update_data.pop("_id", None)
    try:
        await db[collection_name].update_one(
            {"_id": ObjectId(item_id)},
            {"$set": update_data}
        )
        return await get_item_by_id(collection_name, item_id)
    except:
        return None

async def delete_item(collection_name: str, item_id: str):
    """Delete an item"""
    try:
        result = await db[collection_name].delete_one({"_id": ObjectId(item_id)})
        return result.deleted_count > 0
    except:
        return False

async def filter_items(collection_name: str, filters: dict, sort_by: str = None, limit: int = 100):
    """Filter items based on criteria"""
    if sort_by and sort_by.startswith("-"):
        sort_order = [(sort_by[1:], -1)]
    elif sort_by:
        sort_order = [(sort_by, 1)]
    else:
        sort_order = [("created_date", -1)]
    
    cursor = db[collection_name].find(filters).sort(sort_order).limit(limit)
    items = await cursor.to_list(length=limit)
    return [serialize_doc(item) for item in items]

# API Routes
@app.get("/")
async def root():
    return {"message": "Quality Studio API", "version": "1.0.0", "status": "running"}

@app.get("/api/health")
async def health_check():
    try:
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Authentication endpoints
@app.post("/api/auth/login", tags=["Authentication"])
async def login(credentials: Dict[str, str]):
    """Login with email and password - returns JWT token"""
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    user = await authenticate_user_async(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = AuthService.create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/auth/register", tags=["Authentication"])
async def register(credentials: Dict[str, str]):
    """Register a new user"""
    email = credentials.get("email")
    password = credentials.get("password")
    name = credentials.get("name", email.split("@")[0] if email else "")
    role = credentials.get("role", "operator")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Check if email already exists in demo users
    if email in DEMO_USERS:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user in MongoDB
    user = await create_user(email, password, name, role)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered or registration failed")
    
    # Generate token
    access_token = AuthService.create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/auth/validate-token", tags=["Authentication"])
async def validate_token(data: Dict[str, str]):
    """Validate a JWT token and return user info"""
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    
    is_valid, payload, error = AuthService.validate_token(token)
    
    if not is_valid:
        raise HTTPException(status_code=401, detail=error or "Invalid token")
    
    user_id = payload.get("sub")
    user = await get_user_by_id_async(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "valid": True,
        "user": user
    }

@app.get("/api/auth/me", tags=["Authentication"])
async def get_current_user_info(current_user: Dict = Depends(get_current_user_required)):
    """Get current user info (requires valid token)"""
    return current_user

@app.get("/api/auth/permissions", tags=["Authentication"])
async def get_user_permissions(current_user: Dict = Depends(get_current_user_required)):
    """Get current user's permissions"""
    user = User(**current_user)
    permissions = list(user.get_permissions())
    
    return {
        "role": user.role,
        "permissions": permissions
    }

@app.get("/api/auth/roles", tags=["Authentication"])
async def get_all_roles():
    """Get all available roles and their descriptions"""
    return ROLE_DESCRIPTIONS

@app.get("/api/auth/demo-users", tags=["Authentication"])
async def get_demo_users():
    """Get demo user credentials for testing"""
    return {
        "primary_admin": {
            "email": "shubhrangshub@gmail.com",
            "password": "admin123",
            "role": "admin",
            "description": "Primary Admin - Full system access"
        },
        "admin": {
            "email": "admin@qualitystudio.com",
            "password": "admin123",
            "role": "admin",
            "description": "Full system access"
        },
        "quality_inspector": {
            "email": "inspector@qualitystudio.com",
            "password": "inspector123",
            "role": "quality_inspector",
            "description": "Quality inspection and defect reporting"
        },
        "quality_engineer": {
            "email": "engineer@qualitystudio.com",
            "password": "engineer123",
            "role": "quality_engineer",
            "description": "RCA, CAPA, and process optimization"
        },
        "sales": {
            "email": "sales@qualitystudio.com",
            "password": "sales123",
            "role": "sales",
            "description": "Customer complaints and quality viewing"
        },
        "operator": {
            "email": "operator@qualitystudio.com",
            "password": "operator123",
            "role": "operator",
            "description": "Production defect reporting and process logging"
        }
    }

# ============== EXPLICIT CRUD ENDPOINTS ==============

# CustomerComplaint endpoints
@app.get("/api/customer_complaints", tags=["CustomerComplaint"])
async def list_customer_complaints(sort: Optional[str] = None, limit: int = 100):
    return await get_items("customer_complaints", sort, limit)

@app.post("/api/customer_complaints", tags=["CustomerComplaint"])
async def create_customer_complaint(item: CustomerComplaint):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("customer_complaints", item_dict)

@app.get("/api/customer_complaints/{item_id}", tags=["CustomerComplaint"])
async def get_customer_complaint(item_id: str):
    item = await get_item_by_id("customer_complaints", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/customer_complaints/{item_id}", tags=["CustomerComplaint"])
async def update_customer_complaint(item_id: str, item: CustomerComplaint):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("customer_complaints", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/customer_complaints/{item_id}", tags=["CustomerComplaint"])
async def delete_customer_complaint(item_id: str):
    deleted = await delete_item("customer_complaints", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/customer_complaints/filter", tags=["CustomerComplaint"])
async def filter_customer_complaints(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("customer_complaints", filters, sort, limit)

# DefectTicket endpoints
@app.get("/api/defect_tickets", tags=["DefectTicket"])
async def list_defect_tickets(sort: Optional[str] = None, limit: int = 100):
    return await get_items("defect_tickets", sort, limit)

@app.post("/api/defect_tickets", tags=["DefectTicket"])
async def create_defect_ticket(item: DefectTicket):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("defect_tickets", item_dict)

@app.get("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def get_defect_ticket(item_id: str):
    item = await get_item_by_id("defect_tickets", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def update_defect_ticket(item_id: str, item: DefectTicket):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("defect_tickets", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def delete_defect_ticket(item_id: str):
    deleted = await delete_item("defect_tickets", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/defect_tickets/filter", tags=["DefectTicket"])
async def filter_defect_tickets(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("defect_tickets", filters, sort, limit)

# RCARecord endpoints
@app.get("/api/rca_records", tags=["RCARecord"])
async def list_rca_records(sort: Optional[str] = None, limit: int = 100):
    return await get_items("rca_records", sort, limit)

@app.post("/api/rca_records", tags=["RCARecord"])
async def create_rca_record(item: RCARecord):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("rca_records", item_dict)

@app.get("/api/rca_records/{item_id}", tags=["RCARecord"])
async def get_rca_record(item_id: str):
    item = await get_item_by_id("rca_records", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/rca_records/{item_id}", tags=["RCARecord"])
async def update_rca_record(item_id: str, item: RCARecord):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("rca_records", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/rca_records/{item_id}", tags=["RCARecord"])
async def delete_rca_record(item_id: str):
    deleted = await delete_item("rca_records", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/rca_records/filter", tags=["RCARecord"])
async def filter_rca_records(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("rca_records", filters, sort, limit)

# CAPAPlan endpoints
@app.get("/api/capa_plans", tags=["CAPAPlan"])
async def list_capa_plans(sort: Optional[str] = None, limit: int = 100):
    return await get_items("capa_plans", sort, limit)

@app.post("/api/capa_plans", tags=["CAPAPlan"])
async def create_capa_plan(item: CAPAPlan):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("capa_plans", item_dict)

@app.get("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def get_capa_plan(item_id: str):
    item = await get_item_by_id("capa_plans", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def update_capa_plan(item_id: str, item: CAPAPlan):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("capa_plans", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def delete_capa_plan(item_id: str):
    deleted = await delete_item("capa_plans", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/capa_plans/filter", tags=["CAPAPlan"])
async def filter_capa_plans(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("capa_plans", filters, sort, limit)

# ProcessRun endpoints
@app.get("/api/process_runs", tags=["ProcessRun"])
async def list_process_runs(sort: Optional[str] = None, limit: int = 100):
    return await get_items("process_runs", sort, limit)

@app.post("/api/process_runs", tags=["ProcessRun"])
async def create_process_run(item: ProcessRun):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("process_runs", item_dict)

@app.get("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def get_process_run(item_id: str):
    item = await get_item_by_id("process_runs", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def update_process_run(item_id: str, item: ProcessRun):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("process_runs", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def delete_process_run(item_id: str):
    deleted = await delete_item("process_runs", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/process_runs/filter", tags=["ProcessRun"])
async def filter_process_runs(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("process_runs", filters, sort, limit)

# GoldenBatch endpoints
@app.get("/api/golden_batches", tags=["GoldenBatch"])
async def list_golden_batches(sort: Optional[str] = None, limit: int = 100):
    return await get_items("golden_batches", sort, limit)

@app.post("/api/golden_batches", tags=["GoldenBatch"])
async def create_golden_batch(item: GoldenBatch):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("golden_batches", item_dict)

@app.get("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def get_golden_batch(item_id: str):
    item = await get_item_by_id("golden_batches", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def update_golden_batch(item_id: str, item: GoldenBatch):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("golden_batches", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def delete_golden_batch(item_id: str):
    deleted = await delete_item("golden_batches", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/golden_batches/filter", tags=["GoldenBatch"])
async def filter_golden_batches(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("golden_batches", filters, sort, limit)

# SOP endpoints
@app.get("/api/sops", tags=["SOP"])
async def list_sops(sort: Optional[str] = None, limit: int = 100):
    return await get_items("sops", sort, limit)

@app.post("/api/sops", tags=["SOP"])
async def create_sop(item: SOP):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("sops", item_dict)

@app.get("/api/sops/{item_id}", tags=["SOP"])
async def get_sop(item_id: str):
    item = await get_item_by_id("sops", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/sops/{item_id}", tags=["SOP"])
async def update_sop(item_id: str, item: SOP):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("sops", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/sops/{item_id}", tags=["SOP"])
async def delete_sop(item_id: str):
    deleted = await delete_item("sops", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/sops/filter", tags=["SOP"])
async def filter_sops(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("sops", filters, sort, limit)

# DoE endpoints
@app.get("/api/does", tags=["DoE"])
async def list_does(sort: Optional[str] = None, limit: int = 100):
    return await get_items("does", sort, limit)

@app.post("/api/does", tags=["DoE"])
async def create_doe(item: DoE):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("does", item_dict)

@app.get("/api/does/{item_id}", tags=["DoE"])
async def get_doe(item_id: str):
    item = await get_item_by_id("does", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/does/{item_id}", tags=["DoE"])
async def update_doe(item_id: str, item: DoE):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("does", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/does/{item_id}", tags=["DoE"])
async def delete_doe(item_id: str):
    deleted = await delete_item("does", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/does/filter", tags=["DoE"])
async def filter_does(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("does", filters, sort, limit)

# KnowledgeDocument endpoints
@app.get("/api/knowledge_documents", tags=["KnowledgeDocument"])
async def list_knowledge_documents(sort: Optional[str] = None, limit: int = 100):
    return await get_items("knowledge_documents", sort, limit)

@app.post("/api/knowledge_documents", tags=["KnowledgeDocument"])
async def create_knowledge_document(item: KnowledgeDocument):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("knowledge_documents", item_dict)

@app.get("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def get_knowledge_document(item_id: str):
    item = await get_item_by_id("knowledge_documents", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def update_knowledge_document(item_id: str, item: KnowledgeDocument):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("knowledge_documents", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def delete_knowledge_document(item_id: str):
    deleted = await delete_item("knowledge_documents", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/knowledge_documents/filter", tags=["KnowledgeDocument"])
async def filter_knowledge_documents(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("knowledge_documents", filters, sort, limit)

# Equipment endpoints
@app.get("/api/equipment", tags=["Equipment"])
async def list_equipment(sort: Optional[str] = None, limit: int = 100):
    return await get_items("equipment", sort, limit)

@app.post("/api/equipment", tags=["Equipment"])
async def create_equipment(item: Equipment):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("equipment", item_dict)

@app.get("/api/equipment/{item_id}", tags=["Equipment"])
async def get_equipment(item_id: str):
    item = await get_item_by_id("equipment", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/equipment/{item_id}", tags=["Equipment"])
async def update_equipment(item_id: str, item: Equipment):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("equipment", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/equipment/{item_id}", tags=["Equipment"])
async def delete_equipment(item_id: str):
    deleted = await delete_item("equipment", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/equipment/filter", tags=["Equipment"])
async def filter_equipment(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("equipment", filters, sort, limit)

# FileUploadHistory endpoints
@app.get("/api/file_upload_history", tags=["FileUploadHistory"])
async def list_file_upload_history(sort: Optional[str] = None, limit: int = 100):
    return await get_items("file_upload_history", sort, limit)

@app.post("/api/file_upload_history", tags=["FileUploadHistory"])
async def create_file_upload_history(item: FileUploadHistory):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("file_upload_history", item_dict)

@app.get("/api/file_upload_history/{item_id}", tags=["FileUploadHistory"])
async def get_file_upload_history(item_id: str):
    item = await get_item_by_id("file_upload_history", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.delete("/api/file_upload_history/{item_id}", tags=["FileUploadHistory"])
async def delete_file_upload_history(item_id: str):
    deleted = await delete_item("file_upload_history", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# KPI endpoints
@app.get("/api/kpis", tags=["KPI"])
async def list_kpis(sort: Optional[str] = None, limit: int = 100):
    return await get_items("kpis", sort, limit)

@app.post("/api/kpis", tags=["KPI"])
async def create_kpi(item: KPI):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("kpis", item_dict)

@app.get("/api/kpis/{item_id}", tags=["KPI"])
async def get_kpi(item_id: str):
    item = await get_item_by_id("kpis", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/kpis/{item_id}", tags=["KPI"])
async def update_kpi(item_id: str, item: KPI):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("kpis", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/kpis/{item_id}", tags=["KPI"])
async def delete_kpi(item_id: str):
    deleted = await delete_item("kpis", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/kpis/filter", tags=["KPI"])
async def filter_kpis(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("kpis", filters, sort, limit)

# File upload endpoint
@app.post("/api/upload", tags=["Files"])
async def upload_file(file: UploadFile = File(...)):
    """Upload a file"""
    file_data = {
        "fileName": file.filename,
        "fileType": file.content_type,
        "uploadDate": datetime.utcnow(),
        "fileSize": 0,
        "status": "completed"
    }
    return await create_item("file_upload_history", file_data)

# Batch operations
@app.post("/api/batch/create", tags=["Batch"])
async def batch_create(collection: str, items: List[Dict[str, Any]]):
    """Create multiple items at once"""
    for item in items:
        item["created_date"] = datetime.utcnow()
        item["updated_date"] = datetime.utcnow()
    
    result = await db[collection].insert_many(items)
    return {"inserted_count": len(result.inserted_ids), "ids": [str(id) for id in result.inserted_ids]}

# Statistics endpoint
@app.get("/api/statistics", tags=["Analytics"])
async def get_statistics():
    """Get overall statistics"""
    collections = [
        ("customer_complaints", "CustomerComplaint"),
        ("defect_tickets", "DefectTicket"),
        ("rca_records", "RCARecord"),
        ("capa_plans", "CAPAPlan"),
        ("process_runs", "ProcessRun"),
        ("golden_batches", "GoldenBatch"),
        ("sops", "SOP"),
        ("does", "DoE"),
        ("knowledge_documents", "KnowledgeDocument"),
        ("equipment", "Equipment"),
        ("file_upload_history", "FileUploadHistory"),
        ("kpis", "KPI")
    ]
    stats = {}
    for coll_name, display_name in collections:
        count = await db[coll_name].count_documents({})
        stats[display_name] = count
    return stats

# AI Service Endpoints (using GPT-5.2)
from services import ai_service

@app.post("/api/ai/rca-suggestions", tags=["AI"])
async def get_ai_rca_suggestions(data: Dict[str, Any]):
    """Get AI-powered RCA suggestions using GPT-5.2"""
    defect_description = data.get("description", "")
    defect_type = data.get("defectType", "unknown")
    severity = data.get("severity", "minor")
    
    suggestions = await ai_service.get_rca_suggestions(defect_description, defect_type, severity)
    return suggestions

@app.post("/api/ai/classify-defect", tags=["AI"])
async def classify_defect(data: Dict[str, Any]):
    """AI-powered defect classification using GPT-5.2"""
    description = data.get("description", "")
    image_url = data.get("imageUrl")
    
    classification = await ai_service.classify_defect(description, image_url)
    return classification

@app.post("/api/ai/generate-capa", tags=["AI"])
async def generate_capa_actions(data: Dict[str, Any]):
    """Generate CAPA actions based on root cause using GPT-5.2"""
    root_cause = data.get("rootCause", "")
    defect_type = data.get("defectType", "")
    
    capa = await ai_service.generate_capa_actions(root_cause, defect_type)
    return capa

@app.post("/api/ai/predict-trend", tags=["AI"])
async def predict_defect_trend(data: Dict[str, Any]):
    """Predict defect trends using GPT-5.2"""
    historical_defects = data.get("historicalDefects", [])
    
    prediction = await ai_service.predict_defect_trend(historical_defects)
    return prediction

@app.post("/api/ai/search-knowledge", tags=["AI"])
async def search_knowledge(data: Dict[str, Any]):
    """Semantic knowledge base search using GPT-5.2"""
    query = data.get("query", "")
    
    documents = await get_items("knowledge_documents", limit=1000)
    
    results = await ai_service.search_knowledge_base(query, documents)
    return results

@app.post("/api/ai/invoke-llm", tags=["AI"])
async def invoke_llm(data: Dict[str, Any]):
    """Generic LLM invocation endpoint for frontend integrations
    
    This replaces the Base44 integrations.Core.InvokeLLM functionality.
    Supports structured prompts with optional JSON schema for responses.
    """
    prompt = data.get("prompt", "")
    response_json_schema = data.get("response_json_schema", None)
    add_context = data.get("add_context_from_user_data", False)
    
    if not prompt:
        return {"error": "Prompt is required", "response": None}
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        
        EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
        
        # Build system message based on whether JSON schema is expected
        system_message = "You are a helpful AI assistant for quality management tasks."
        if response_json_schema:
            system_message += f"\n\nYou must respond in valid JSON format matching this schema:\n{json.dumps(response_json_schema, indent=2)}"
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"invoke-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Try to parse as JSON if schema was provided
        if response_json_schema:
            try:
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                return json.loads(response_text.strip())
            except json.JSONDecodeError:
                return {"response": response, "model": "gpt-5.2"}
        else:
            return {"response": response, "model": "gpt-5.2"}
            
    except Exception as e:
        logger.error(f"LLM invocation error: {str(e)}")
        return {"error": str(e), "response": None, "model": "error"}

# ============== FILE UPLOAD ENDPOINTS ==============
from services.file_upload_service import save_upload_file, save_multiple_files, delete_file, list_files
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/files/upload", tags=["Files"])
async def upload_single_file(
    file: UploadFile = File(...),
    subdirectory: str = "",
    current_user: Dict = Depends(get_current_user_optional)
):
    """Upload a single file"""
    user_id = current_user.get("id") if current_user else None
    result = await save_upload_file(file, subdirectory, 'all', user_id)
    
    # Also save to file_upload_history
    await create_item("file_upload_history", {
        "fileName": result["original_filename"],
        "fileType": result["content_type"],
        "uploadDate": datetime.utcnow(),
        "uploadedBy": user_id,
        "fileSize": result["file_size"],
        "filePath": result["file_path"],
        "fileUrl": result["file_url"],
        "status": "completed"
    })
    
    return result

@app.post("/api/files/upload-multiple", tags=["Files"])
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    subdirectory: str = "",
    current_user: Dict = Depends(get_current_user_optional)
):
    """Upload multiple files"""
    user_id = current_user.get("id") if current_user else None
    results = await save_multiple_files(files, subdirectory, 'all', user_id)
    return {"files": results, "total": len(results)}

@app.get("/api/files/list", tags=["Files"])
async def list_uploaded_files(subdirectory: str = ""):
    """List all uploaded files"""
    files = list_files(subdirectory)
    return {"files": files, "total": len(files)}

@app.delete("/api/files/{filename}", tags=["Files"])
async def delete_uploaded_file(filename: str, subdirectory: str = ""):
    """Delete an uploaded file"""
    file_path = os.path.join(UPLOAD_DIR, subdirectory, filename) if subdirectory else os.path.join(UPLOAD_DIR, filename)
    success = await delete_file(file_path)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}

# Serve uploaded files
@app.get("/uploads/{file_path:path}", tags=["Files"])
async def serve_uploaded_file(file_path: str):
    """Serve uploaded files"""
    full_path = os.path.join(UPLOAD_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)

# ============== EMAIL NOTIFICATION ENDPOINTS ==============
from services.email_service import email_service

@app.post("/api/notifications/email/test", tags=["Notifications"])
async def test_email_notification(
    data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user_required)
):
    """Send a test email notification (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    to_emails = data.get("to_emails", [current_user.get("email")])
    subject = data.get("subject", "Test Email from QualityStudio")
    body = data.get("body", "<h1>Test Email</h1><p>This is a test email from QualityStudio.</p>")
    
    result = await email_service.send_email(to_emails, subject, body)
    return result

@app.post("/api/notifications/email/critical-defect", tags=["Notifications"])
async def send_critical_defect_notification(
    data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user_optional)
):
    """Send critical defect email notification"""
    to_emails = data.get("to_emails", [])
    if not to_emails:
        return {"success": False, "error": "No recipients specified"}
    
    result = await email_service.send_critical_defect_alert(
        to_emails,
        data.get("ticket_id", ""),
        data.get("defect_type", ""),
        data.get("line", ""),
        data.get("description", ""),
        current_user.get("name", "Unknown") if current_user else "System",
        data.get("app_url", "https://qualitystudio.com")
    )
    return result

@app.get("/api/notifications/email/status", tags=["Notifications"])
async def get_email_service_status():
    """Check email service configuration status"""
    return {
        "enabled": email_service.enabled,
        "smtp_host": email_service.smtp_host,
        "smtp_port": email_service.smtp_port,
        "email_from": email_service.email_from
    }

# ============== WEBSOCKET REAL-TIME NOTIFICATIONS ==============
from services.websocket_service import manager, send_notification, NotificationType
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, user_id: Optional[str] = None):
    """WebSocket endpoint for real-time notifications"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Receive messages from client (for subscriptions, etc.)
            data = await websocket.receive_json()
            
            # Handle subscription requests
            if data.get("action") == "subscribe":
                room = data.get("room", "global")
                manager.subscribe_to_room(websocket, room)
                await manager.send_personal_message(websocket, {
                    "type": "subscribed",
                    "room": room
                })
            elif data.get("action") == "unsubscribe":
                room = data.get("room", "global")
                manager.unsubscribe_from_room(websocket, room)
                await manager.send_personal_message(websocket, {
                    "type": "unsubscribed",
                    "room": room
                })
            elif data.get("action") == "ping":
                await manager.send_personal_message(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

@app.post("/api/notifications/broadcast", tags=["Notifications"])
async def broadcast_notification(
    data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user_required)
):
    """Broadcast a notification to all connected clients (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await send_notification(
        data.get("type", NotificationType.SYSTEM_ALERT),
        data.get("title", "Notification"),
        data.get("message", ""),
        data.get("data"),
        data.get("user_ids"),
        data.get("room"),
        data.get("priority", "normal")
    )
    return {"success": True, "message": "Notification sent"}

# ============== EXPORT ENDPOINTS (PDF/Excel) ==============
from services.export_service import pdf_exporter, excel_exporter
from fastapi.responses import StreamingResponse
import io

@app.get("/api/export/defects/pdf", tags=["Export"])
async def export_defects_pdf(current_user: Dict = Depends(get_current_user_optional)):
    """Export defects report as PDF"""
    defects = await get_items("defect_tickets", "-created_date", 500)
    pdf_bytes = pdf_exporter.create_defects_report(defects, "Defect Report")
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=defects_report.pdf"}
    )

@app.get("/api/export/defects/excel", tags=["Export"])
async def export_defects_excel(current_user: Dict = Depends(get_current_user_optional)):
    """Export defects as Excel spreadsheet"""
    defects = await get_items("defect_tickets", "-created_date", 1000)
    excel_bytes = excel_exporter.create_defects_export(defects)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=defects_export.xlsx"}
    )

@app.get("/api/export/complaints/pdf", tags=["Export"])
async def export_complaints_pdf(current_user: Dict = Depends(get_current_user_optional)):
    """Export complaints report as PDF"""
    complaints = await get_items("customer_complaints", "-created_date", 500)
    pdf_bytes = pdf_exporter.create_complaints_report(complaints)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=complaints_report.pdf"}
    )

@app.get("/api/export/complaints/excel", tags=["Export"])
async def export_complaints_excel(current_user: Dict = Depends(get_current_user_optional)):
    """Export complaints as Excel spreadsheet"""
    complaints = await get_items("customer_complaints", "-created_date", 1000)
    excel_bytes = excel_exporter.create_complaints_export(complaints)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=complaints_export.xlsx"}
    )

@app.get("/api/export/kpis/pdf", tags=["Export"])
async def export_kpis_pdf(current_user: Dict = Depends(get_current_user_optional)):
    """Export KPIs report as PDF"""
    kpis = await get_items("kpis", "-recordDate", 365)
    pdf_bytes = pdf_exporter.create_kpi_report(kpis)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=kpi_report.pdf"}
    )

@app.get("/api/export/kpis/excel", tags=["Export"])
async def export_kpis_excel(current_user: Dict = Depends(get_current_user_optional)):
    """Export KPIs as Excel spreadsheet"""
    kpis = await get_items("kpis", "-recordDate", 1000)
    excel_bytes = excel_exporter.create_kpi_export(kpis)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=kpi_export.xlsx"}
    )

@app.get("/api/export/full/excel", tags=["Export"])
async def export_full_excel(current_user: Dict = Depends(get_current_user_optional)):
    """Export all data as Excel workbook with multiple sheets"""
    defects = await get_items("defect_tickets", "-created_date", 1000)
    complaints = await get_items("customer_complaints", "-created_date", 1000)
    rcas = await get_items("rca_records", "-created_date", 1000)
    capas = await get_items("capa_plans", "-created_date", 1000)
    kpis = await get_items("kpis", "-recordDate", 365)
    
    excel_bytes = excel_exporter.create_full_export(defects, complaints, rcas, capas, kpis)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=qualitystudio_full_export.xlsx"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
