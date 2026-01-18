from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.auth_service import AuthService, authenticate_user, get_user_by_id, DEMO_USERS
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
security = HTTPBearer()

@app.post("/api/auth/login", tags=["Authentication"])
async def login(credentials: Dict[str, str]):
    """Login with email and password"""
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = AuthService.create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", tags=["Authentication"])
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user info"""
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    user = get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@app.get("/api/auth/permissions", tags=["Authentication"])
async def get_user_permissions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user's permissions"""
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    
    user = User(**user_data)
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
    return await get_items("DefectTicket", sort, limit)

@app.post("/api/defect_tickets", tags=["DefectTicket"])
async def create_defect_ticket(item: DefectTicket):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("DefectTicket", item_dict)

@app.get("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def get_defect_ticket(item_id: str):
    item = await get_item_by_id("DefectTicket", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def update_defect_ticket(item_id: str, item: DefectTicket):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("DefectTicket", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/defect_tickets/{item_id}", tags=["DefectTicket"])
async def delete_defect_ticket(item_id: str):
    deleted = await delete_item("DefectTicket", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/defect_tickets/filter", tags=["DefectTicket"])
async def filter_defect_tickets(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("DefectTicket", filters, sort, limit)

# RCARecord endpoints
@app.get("/api/rca_records", tags=["RCARecord"])
async def list_rca_records(sort: Optional[str] = None, limit: int = 100):
    return await get_items("RCARecord", sort, limit)

@app.post("/api/rca_records", tags=["RCARecord"])
async def create_rca_record(item: RCARecord):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("RCARecord", item_dict)

@app.get("/api/rca_records/{item_id}", tags=["RCARecord"])
async def get_rca_record(item_id: str):
    item = await get_item_by_id("RCARecord", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/rca_records/{item_id}", tags=["RCARecord"])
async def update_rca_record(item_id: str, item: RCARecord):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("RCARecord", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/rca_records/{item_id}", tags=["RCARecord"])
async def delete_rca_record(item_id: str):
    deleted = await delete_item("RCARecord", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/rca_records/filter", tags=["RCARecord"])
async def filter_rca_records(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("RCARecord", filters, sort, limit)

# CAPAPlan endpoints
@app.get("/api/capa_plans", tags=["CAPAPlan"])
async def list_capa_plans(sort: Optional[str] = None, limit: int = 100):
    return await get_items("CAPAPlan", sort, limit)

@app.post("/api/capa_plans", tags=["CAPAPlan"])
async def create_capa_plan(item: CAPAPlan):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("CAPAPlan", item_dict)

@app.get("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def get_capa_plan(item_id: str):
    item = await get_item_by_id("CAPAPlan", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def update_capa_plan(item_id: str, item: CAPAPlan):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("CAPAPlan", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/capa_plans/{item_id}", tags=["CAPAPlan"])
async def delete_capa_plan(item_id: str):
    deleted = await delete_item("CAPAPlan", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/capa_plans/filter", tags=["CAPAPlan"])
async def filter_capa_plans(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("CAPAPlan", filters, sort, limit)

# ProcessRun endpoints
@app.get("/api/process_runs", tags=["ProcessRun"])
async def list_process_runs(sort: Optional[str] = None, limit: int = 100):
    return await get_items("ProcessRun", sort, limit)

@app.post("/api/process_runs", tags=["ProcessRun"])
async def create_process_run(item: ProcessRun):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("ProcessRun", item_dict)

@app.get("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def get_process_run(item_id: str):
    item = await get_item_by_id("ProcessRun", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def update_process_run(item_id: str, item: ProcessRun):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("ProcessRun", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/process_runs/{item_id}", tags=["ProcessRun"])
async def delete_process_run(item_id: str):
    deleted = await delete_item("ProcessRun", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/process_runs/filter", tags=["ProcessRun"])
async def filter_process_runs(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("ProcessRun", filters, sort, limit)

# GoldenBatch endpoints
@app.get("/api/golden_batches", tags=["GoldenBatch"])
async def list_golden_batches(sort: Optional[str] = None, limit: int = 100):
    return await get_items("GoldenBatch", sort, limit)

@app.post("/api/golden_batches", tags=["GoldenBatch"])
async def create_golden_batch(item: GoldenBatch):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("GoldenBatch", item_dict)

@app.get("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def get_golden_batch(item_id: str):
    item = await get_item_by_id("GoldenBatch", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def update_golden_batch(item_id: str, item: GoldenBatch):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("GoldenBatch", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/golden_batches/{item_id}", tags=["GoldenBatch"])
async def delete_golden_batch(item_id: str):
    deleted = await delete_item("GoldenBatch", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/golden_batches/filter", tags=["GoldenBatch"])
async def filter_golden_batches(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("GoldenBatch", filters, sort, limit)

# SOP endpoints
@app.get("/api/sops", tags=["SOP"])
async def list_sops(sort: Optional[str] = None, limit: int = 100):
    return await get_items("SOP", sort, limit)

@app.post("/api/sops", tags=["SOP"])
async def create_sop(item: SOP):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("SOP", item_dict)

@app.get("/api/sops/{item_id}", tags=["SOP"])
async def get_sop(item_id: str):
    item = await get_item_by_id("SOP", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/sops/{item_id}", tags=["SOP"])
async def update_sop(item_id: str, item: SOP):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("SOP", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/sops/{item_id}", tags=["SOP"])
async def delete_sop(item_id: str):
    deleted = await delete_item("SOP", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/sops/filter", tags=["SOP"])
async def filter_sops(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("SOP", filters, sort, limit)

# DoE endpoints
@app.get("/api/does", tags=["DoE"])
async def list_does(sort: Optional[str] = None, limit: int = 100):
    return await get_items("DoE", sort, limit)

@app.post("/api/does", tags=["DoE"])
async def create_doe(item: DoE):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("DoE", item_dict)

@app.get("/api/does/{item_id}", tags=["DoE"])
async def get_doe(item_id: str):
    item = await get_item_by_id("DoE", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/does/{item_id}", tags=["DoE"])
async def update_doe(item_id: str, item: DoE):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("DoE", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/does/{item_id}", tags=["DoE"])
async def delete_doe(item_id: str):
    deleted = await delete_item("DoE", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/does/filter", tags=["DoE"])
async def filter_does(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("DoE", filters, sort, limit)

# KnowledgeDocument endpoints
@app.get("/api/knowledge_documents", tags=["KnowledgeDocument"])
async def list_knowledge_documents(sort: Optional[str] = None, limit: int = 100):
    return await get_items("KnowledgeDocument", sort, limit)

@app.post("/api/knowledge_documents", tags=["KnowledgeDocument"])
async def create_knowledge_document(item: KnowledgeDocument):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("KnowledgeDocument", item_dict)

@app.get("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def get_knowledge_document(item_id: str):
    item = await get_item_by_id("KnowledgeDocument", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def update_knowledge_document(item_id: str, item: KnowledgeDocument):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("KnowledgeDocument", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/knowledge_documents/{item_id}", tags=["KnowledgeDocument"])
async def delete_knowledge_document(item_id: str):
    deleted = await delete_item("KnowledgeDocument", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/knowledge_documents/filter", tags=["KnowledgeDocument"])
async def filter_knowledge_documents(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("KnowledgeDocument", filters, sort, limit)

# Equipment endpoints
@app.get("/api/equipment", tags=["Equipment"])
async def list_equipment(sort: Optional[str] = None, limit: int = 100):
    return await get_items("Equipment", sort, limit)

@app.post("/api/equipment", tags=["Equipment"])
async def create_equipment(item: Equipment):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("Equipment", item_dict)

@app.get("/api/equipment/{item_id}", tags=["Equipment"])
async def get_equipment(item_id: str):
    item = await get_item_by_id("Equipment", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/equipment/{item_id}", tags=["Equipment"])
async def update_equipment(item_id: str, item: Equipment):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("Equipment", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/equipment/{item_id}", tags=["Equipment"])
async def delete_equipment(item_id: str):
    deleted = await delete_item("Equipment", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/equipment/filter", tags=["Equipment"])
async def filter_equipment(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("Equipment", filters, sort, limit)

# FileUploadHistory endpoints
@app.get("/api/file_upload_history", tags=["FileUploadHistory"])
async def list_file_upload_history(sort: Optional[str] = None, limit: int = 100):
    return await get_items("FileUploadHistory", sort, limit)

@app.post("/api/file_upload_history", tags=["FileUploadHistory"])
async def create_file_upload_history(item: FileUploadHistory):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("FileUploadHistory", item_dict)

@app.get("/api/file_upload_history/{item_id}", tags=["FileUploadHistory"])
async def get_file_upload_history(item_id: str):
    item = await get_item_by_id("FileUploadHistory", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.delete("/api/file_upload_history/{item_id}", tags=["FileUploadHistory"])
async def delete_file_upload_history(item_id: str):
    deleted = await delete_item("FileUploadHistory", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# KPI endpoints
@app.get("/api/kpis", tags=["KPI"])
async def list_kpis(sort: Optional[str] = None, limit: int = 100):
    return await get_items("KPI", sort, limit)

@app.post("/api/kpis", tags=["KPI"])
async def create_kpi(item: KPI):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    return await create_item("KPI", item_dict)

@app.get("/api/kpis/{item_id}", tags=["KPI"])
async def get_kpi(item_id: str):
    item = await get_item_by_id("KPI", item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/api/kpis/{item_id}", tags=["KPI"])
async def update_kpi(item_id: str, item: KPI):
    item_dict = item.model_dump(exclude={"id"}, exclude_none=False)
    updated = await update_item("KPI", item_id, item_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/api/kpis/{item_id}", tags=["KPI"])
async def delete_kpi(item_id: str):
    deleted = await delete_item("KPI", item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@app.post("/api/kpis/filter", tags=["KPI"])
async def filter_kpis(filters: Dict[str, Any], sort: Optional[str] = None, limit: int = 100):
    return await filter_items("KPI", filters, sort, limit)

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
    return await create_item("FileUploadHistory", file_data)

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
        "CustomerComplaint", "DefectTicket", "RCARecord", "CAPAPlan",
        "ProcessRun", "GoldenBatch", "SOP", "DoE", "KnowledgeDocument",
        "Equipment", "FileUploadHistory", "KPI"
    ]
    stats = {}
    for coll_name in collections:
        count = await db[coll_name].count_documents({})
        stats[coll_name] = count
    return stats

# AI Service Endpoints (mock for now, will be replaced with real AI)
from services import ai_service_mock

@app.post("/api/ai/rca-suggestions", tags=["AI"])
async def get_ai_rca_suggestions(data: Dict[str, Any]):
    """Get AI-powered RCA suggestions"""
    defect_description = data.get("description", "")
    defect_type = data.get("defectType", "unknown")
    severity = data.get("severity", "minor")
    
    suggestions = ai_service_mock.get_rca_suggestions(defect_description, defect_type, severity)
    return suggestions

@app.post("/api/ai/classify-defect", tags=["AI"])
async def classify_defect(data: Dict[str, Any]):
    """AI-powered defect classification"""
    description = data.get("description", "")
    image_url = data.get("imageUrl")
    
    classification = ai_service_mock.classify_defect(description, image_url)
    return classification

@app.post("/api/ai/generate-capa", tags=["AI"])
async def generate_capa_actions(data: Dict[str, Any]):
    """Generate CAPA actions based on root cause"""
    root_cause = data.get("rootCause", "")
    defect_type = data.get("defectType", "")
    
    capa = ai_service_mock.generate_capa_actions(root_cause, defect_type)
    return capa

@app.post("/api/ai/predict-trend", tags=["AI"])
async def predict_defect_trend(data: Dict[str, Any]):
    """Predict defect trends"""
    historical_defects = data.get("historicalDefects", [])
    
    prediction = ai_service_mock.predict_defect_trend(historical_defects)
    return prediction

@app.post("/api/ai/search-knowledge", tags=["AI"])
async def search_knowledge(data: Dict[str, Any]):
    """Semantic knowledge base search"""
    query = data.get("query", "")
    
    documents = await get_items("KnowledgeDocument", limit=1000)
    
    results = ai_service_mock.search_knowledge_base(query, documents)
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
