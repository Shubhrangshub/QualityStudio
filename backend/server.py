from fastapi import FastAPI, HTTPException, File, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Quality Studio API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "quality_studio")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

# Base Model
class BaseDBModel(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

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
    """Convert MongoDB document to JSON-serializable dict"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc

async def create_item(collection_name: str, item_data: dict):
    """Create a new item in collection"""
    item_data["created_date"] = datetime.utcnow()
    item_data["updated_date"] = datetime.utcnow()
    result = await db[collection_name].insert_one(item_data)
    created_item = await db[collection_name].find_one({"_id": result.inserted_id})
    return serialize_doc(created_item)

async def get_items(collection_name: str, sort_by: str = None, limit: int = 100):
    """Get all items from collection"""
    query = {}
    sort_order = [(sort_by[1:], -1)] if sort_by and sort_by.startswith("-") else [(sort_by, 1)] if sort_by else [("created_date", -1)]
    
    cursor = db[collection_name].find(query).sort(sort_order).limit(limit)
    items = await cursor.to_list(length=limit)
    return [serialize_doc(item) for item in items]

async def get_item_by_id(collection_name: str, item_id: str):
    """Get single item by ID"""
    from bson import ObjectId
    try:
        item = await db[collection_name].find_one({"_id": ObjectId(item_id)})
        return serialize_doc(item) if item else None
    except:
        return None

async def update_item(collection_name: str, item_id: str, update_data: dict):
    """Update an item"""
    from bson import ObjectId
    update_data["updated_date"] = datetime.utcnow()
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
    from bson import ObjectId
    try:
        result = await db[collection_name].delete_one({"_id": ObjectId(item_id)})
        return result.deleted_count > 0
    except:
        return False

async def filter_items(collection_name: str, filters: dict, sort_by: str = None, limit: int = 100):
    """Filter items based on criteria"""
    sort_order = [(sort_by[1:], -1)] if sort_by and sort_by.startswith("-") else [(sort_by, 1)] if sort_by else [("created_date", -1)]
    
    cursor = db[collection_name].find(filters).sort(sort_order).limit(limit)
    items = await cursor.to_list(length=limit)
    return [serialize_doc(item) for item in items]

# API Routes
@app.get("/")
async def root():
    return {"message": "Quality Studio API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    try:
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Generic CRUD endpoints for each entity
COLLECTIONS = {
    "CustomerComplaint": (CustomerComplaint, "customer_complaints"),
    "DefectTicket": (DefectTicket, "defect_tickets"),
    "RCARecord": (RCARecord, "rca_records"),
    "CAPAPlan": (CAPAPlan, "capa_plans"),
    "ProcessRun": (ProcessRun, "process_runs"),
    "GoldenBatch": (GoldenBatch, "golden_batches"),
    "SOP": (SOP, "sops"),
    "DoE": (DoE, "does"),
    "KnowledgeDocument": (KnowledgeDocument, "knowledge_documents"),
    "Equipment": (Equipment, "equipment"),
    "FileUploadHistory": (FileUploadHistory, "file_upload_history"),
    "KPI": (KPI, "kpis")
}

# Dynamically create routes for each collection
for entity_name, (model_class, collection_name) in COLLECTIONS.items():
    
    # List endpoint
    @app.get(f"/api/{collection_name}", tags=[entity_name])
    async def list_items(
        sort: Optional[str] = None,
        limit: int = 100,
        coll=collection_name
    ):
        return await get_items(coll, sort, limit)
    
    # Create endpoint
    @app.post(f"/api/{collection_name}", tags=[entity_name])
    async def create_item_endpoint(item: model_class, coll=collection_name):
        item_dict = item.model_dump(exclude={"id"}, exclude_none=True)
        return await create_item(coll, item_dict)
    
    # Get by ID endpoint
    @app.get(f"/api/{collection_name}/{{item_id}}", tags=[entity_name])
    async def get_item_endpoint(item_id: str, coll=collection_name):
        item = await get_item_by_id(coll, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item
    
    # Update endpoint
    @app.put(f"/api/{collection_name}/{{item_id}}", tags=[entity_name])
    async def update_item_endpoint(item_id: str, item: model_class, coll=collection_name):
        item_dict = item.model_dump(exclude={"id"}, exclude_none=True)
        updated = await update_item(coll, item_id, item_dict)
        if not updated:
            raise HTTPException(status_code=404, detail="Item not found")
        return updated
    
    # Delete endpoint
    @app.delete(f"/api/{collection_name}/{{item_id}}", tags=[entity_name])
    async def delete_item_endpoint(item_id: str, coll=collection_name):
        deleted = await delete_item(coll, item_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item deleted successfully"}
    
    # Filter endpoint
    @app.post(f"/api/{collection_name}/filter", tags=[entity_name])
    async def filter_items_endpoint(
        filters: Dict[str, Any],
        sort: Optional[str] = None,
        limit: int = 100,
        coll=collection_name
    ):
        return await filter_items(coll, filters, sort, limit)

# File upload endpoint
@app.post("/api/upload", tags=["Files"])
async def upload_file(file: UploadFile = File(...)):
    """Upload a file"""
    # In production, save to cloud storage (S3, etc.)
    file_data = {
        "fileName": file.filename,
        "fileType": file.content_type,
        "uploadDate": datetime.utcnow(),
        "fileSize": 0,  # Would calculate actual size
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
    stats = {}
    for entity_name, (_, collection_name) in COLLECTIONS.items():

# AI Service Endpoints
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
    
    # Get all knowledge documents
    documents = await get_items("knowledge_documents", limit=1000)
    
    results = ai_service_mock.search_knowledge_base(query, documents)
    return results

        count = await db[collection_name].count_documents({})
        stats[entity_name] = count
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
