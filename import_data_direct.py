#!/usr/bin/env python3
"""
Direct MongoDB import for Quality Studio
Bypasses API to directly insert sample data
"""
from pymongo import MongoClient
from datetime import datetime, timedelta
import random

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["quality_studio"]

print("\n" + "="*60)
print("QUALITY STUDIO - DIRECT MONGODB IMPORT")
print("="*60 + "\n")

# Clear existing data
print("Clearing existing data...")
for collection in ["customer_complaints", "defect_tickets", "rca_records", "capa_plans", 
                   "process_runs", "golden_batches", "sops", "knowledge_documents"]:
    db[collection].delete_many({})
print("✅ Cleared\n")

# Import Customer Complaints
complaints = [
    {
        "ticketNumber": "COMP-2001",
        "dateLogged": datetime.now() - timedelta(days=15),
        "customerName": "Acme Corporation",
        "productType": "Window Film",
        "complaintDescription": "Film shows bubbles after installation in high humidity conditions",
        "severity": "high",
        "status": "under_investigation",
        "assignedTo": "John Doe",
        "qfirCompleted": True,
        "created_date": datetime.now() - timedelta(days=15),
        "updated_date": datetime.now() - timedelta(days=15)
    },
    {
        "ticketNumber": "COMP-2002",
        "dateLogged": datetime.now() - timedelta(days=12),
        "customerName": "GlobalTech Industries",
        "productType": "PPF",
        "complaintDescription": "Delamination observed on vehicle hood after 6 months",
        "severity": "critical",
        "status": "resolved",
        "assignedTo": "Jane Smith",
        "qfirCompleted": True,
        "created_date": datetime.now() - timedelta(days=12),
        "updated_date": datetime.now() - timedelta(days=2)
    },
    {
        "ticketNumber": "COMP-2003",
        "dateLogged": datetime.now() - timedelta(days=8),
        "customerName": "Metro Auto Group",
        "productType": "Window Film",
        "complaintDescription": "Haze appearance after 3 weeks of application",
        "severity": "medium",
        "status": "pending_qfir",
        "assignedTo": "Bob Johnson",
        "qfirCompleted": False,
        "created_date": datetime.now() - timedelta(days=8),
        "updated_date": datetime.now() - timedelta(days=8)
    },
    {
        "ticketNumber": "COMP-2004",
        "dateLogged": datetime.now() - timedelta(days=5),
        "customerName": "Prime Buildings Ltd",
        "productType": "Window Film",
        "complaintDescription": "Scratches visible on multiple panels",
        "severity": "low",
        "status": "under_investigation",
        "assignedTo": "Jane Smith",
        "qfirCompleted": False,
        "created_date": datetime.now() - timedelta(days=5),
        "updated_date": datetime.now() - timedelta(days=5)
    }
]

result = db.customer_complaints.insert_many(complaints)
print(f"✅ Imported {len(result.inserted_ids)} Customer Complaints")

# Import Defect Tickets
defects = [
    {
        "ticketId": "DEF-1001",
        "dateTime": datetime.now() - timedelta(days=14),
        "line": "Line 1",
        "lane": "Lane A",
        "webPositionMD": "1250",
        "webPositionCD": "750",
        "shift": "Morning",
        "defectType": "bubbles_voids",
        "severity": "major",
        "status": "rca_in_progress",
        "inspectionMethod": "visual",
        "description": "Multiple small bubbles found in center of web, approximately 2-3mm diameter",
        "images": [],
        "rootCause": "Material moisture content exceeded specification",
        "created_date": datetime.now() - timedelta(days=14),
        "updated_date": datetime.now() - timedelta(days=14)
    },
    {
        "ticketId": "DEF-1002",
        "dateTime": datetime.now() - timedelta(days=13),
        "line": "Line 2",
        "lane": "Lane B",
        "webPositionMD": "2100",
        "webPositionCD": "450",
        "shift": "Afternoon",
        "defectType": "delamination",
        "severity": "critical",
        "status": "capa_assigned",
        "inspectionMethod": "visual",
        "description": "Delamination observed at adhesive interface, approximately 50mm x 30mm area",
        "images": [],
        "rootCause": "Insufficient adhesive curing temperature",
        "created_date": datetime.now() - timedelta(days=13),
        "updated_date": datetime.now() - timedelta(days=13)
    },
    {
        "ticketId": "DEF-1003",
        "dateTime": datetime.now() - timedelta(days=11),
        "line": "Line 1",
        "lane": "Lane C",
        "webPositionMD": "3500",
        "webPositionCD": "800",
        "shift": "Night",
        "defectType": "haze",
        "severity": "minor",
        "status": "closed",
        "inspectionMethod": "visual",
        "description": "Slight haze visible under inspection lamp",
        "images": [],
        "created_date": datetime.now() - timedelta(days=11),
        "updated_date": datetime.now() - timedelta(days=1)
    },
    {
        "ticketId": "DEF-1004",
        "dateTime": datetime.now() - timedelta(days=10),
        "line": "Line 3",
        "lane": "Lane A",
        "webPositionMD": "1800",
        "webPositionCD": "600",
        "shift": "Morning",
        "defectType": "scratches",
        "severity": "major",
        "status": "rca_in_progress",
        "inspectionMethod": "visual",
        "description": "Linear scratch pattern, approximately 150mm long",
        "images": [],
        "rootCause": "Worn roller guide bearing",
        "created_date": datetime.now() - timedelta(days=10),
        "updated_date": datetime.now() - timedelta(days=10)
    },
    {
        "ticketId": "DEF-1005",
        "dateTime": datetime.now() - timedelta(days=8),
        "line": "Line 2",
        "lane": "Lane B",
        "webPositionMD": "4200",
        "webPositionCD": "700",
        "shift": "Afternoon",
        "defectType": "fisheyes",
        "severity": "minor",
        "status": "open",
        "inspectionMethod": "visual",
        "description": "Small fisheye defects, 3-4 per meter",
        "images": [],
        "created_date": datetime.now() - timedelta(days=8),
        "updated_date": datetime.now() - timedelta(days=8)
    }
]

result = db.defect_tickets.insert_many(defects)
print(f"✅ Imported {len(result.inserted_ids)} Defect Tickets")

# Import Process Runs
runs = []
for i in range(20):
    runs.append({
        "runId": f"RUN-{3000 + i}",
        "dateTimeStart": datetime.now() - timedelta(hours=i*4),
        "dateTimeEnd": datetime.now() - timedelta(hours=i*4-2),
        "line": f"Line {(i % 3) + 1}",
        "materialType": ["Type A Premium", "Type B Standard", "Type C Economy"][i % 3],
        "parameters": {
            "speed": 45 + (i * 2),
            "temperature": 175 + (i * 3),
            "pressure": 2.3 + (i * 0.15),
            "humidity": 45 + (i * 2)
        },
        "qualityMetrics": {
            "thickness": 0.48 + (i * 0.012),
            "adhesion": 93 + (i * 0.8),
            "clarity": 98 - (i * 0.3),
            "defectCount": random.randint(0, 5)
        },
        "created_date": datetime.now() - timedelta(hours=i*4),
        "updated_date": datetime.now() - timedelta(hours=i*4)
    })

result = db.process_runs.insert_many(runs)
print(f"✅ Imported {len(result.inserted_ids)} Process Runs")

# Import Golden Batches
golden = [
    {
        "batchId": "GB-001",
        "name": "Golden Batch - Premium Window Film Q4 2025",
        "line": "Line 1",
        "materialType": "Type A Premium",
        "parameters": {
            "speed": 50,
            "temperature": 180,
            "pressure": 2.5,
            "humidity": 45
        },
        "qualityMetrics": {
            "thickness": 0.50,
            "adhesion": 98,
            "clarity": 99.5,
            "defectCount": 0
        },
        "dateCreated": datetime.now() - timedelta(days=90),
        "isActive": True,
        "created_date": datetime.now() - timedelta(days=90),
        "updated_date": datetime.now() - timedelta(days=90)
    },
    {
        "batchId": "GB-002",
        "name": "Golden Batch - PPF Standard Q3 2025",
        "line": "Line 2",
        "materialType": "Type B Standard",
        "parameters": {
            "speed": 48,
            "temperature": 178,
            "pressure": 2.4,
            "humidity": 47
        },
        "qualityMetrics": {
            "thickness": 0.52,
            "adhesion": 96,
            "clarity": 98.8,
            "defectCount": 0
        },
        "dateCreated": datetime.now() - timedelta(days=120),
        "isActive": True,
        "created_date": datetime.now() - timedelta(days=120),
        "updated_date": datetime.now() - timedelta(days=120)
    }
]

result = db.golden_batches.insert_many(golden)
print(f"✅ Imported {len(result.inserted_ids)} Golden Batches")

# Import SOPs
sops = [
    {
        "sopNumber": "SOP-001",
        "title": "Material Receiving and Storage Procedure",
        "version": "2.1",
        "department": "Quality Control",
        "content": "This SOP defines the procedures for receiving, inspecting, and storing raw materials to ensure quality standards are maintained throughout the supply chain...",
        "effectiveDate": datetime.now() - timedelta(days=180),
        "status": "active",
        "created_date": datetime.now() - timedelta(days=180),
        "updated_date": datetime.now() - timedelta(days=180)
    },
    {
        "sopNumber": "SOP-002",
        "title": "Defect Identification and Classification",
        "version": "3.0",
        "department": "Quality Control",
        "content": "This SOP provides comprehensive guidelines for identifying and classifying defects in film products including visual inspection criteria and classification methods...",
        "effectiveDate": datetime.now() - timedelta(days=150),
        "status": "active",
        "created_date": datetime.now() - timedelta(days=150),
        "updated_date": datetime.now() - timedelta(days=150)
    },
    {
        "sopNumber": "SOP-003",
        "title": "Root Cause Analysis Procedure",
        "version": "1.5",
        "department": "Quality Engineering",
        "content": "This SOP describes the methodology for conducting root cause analysis using 5 Whys and Ishikawa diagrams to identify and address quality issues systematically...",
        "effectiveDate": datetime.now() - timedelta(days=120),
        "status": "active",
        "created_date": datetime.now() - timedelta(days=120),
        "updated_date": datetime.now() - timedelta(days=120)
    }
]

result = db.sops.insert_many(sops)
print(f"✅ Imported {len(result.inserted_ids)} SOPs")

# Import Knowledge Documents
knowledge = [
    {
        "title": "Common Causes of Bubbles in Window Films",
        "content": "This document summarizes common root causes of bubble defects: 1) High moisture content in material, 2) Insufficient drying, 3) Contamination, 4) Temperature variations. Each cause is analyzed with preventive measures and corrective actions...",
        "category": "Defect Analysis",
        "tags": ["bubbles", "defects", "troubleshooting"],
        "author": "Quality Engineering Team",
        "relatedDefects": [],
        "created_date": datetime.now() - timedelta(days=60),
        "updated_date": datetime.now() - timedelta(days=60)
    },
    {
        "title": "Best Practices for Adhesive Application",
        "content": "Comprehensive guidelines for optimal adhesive application including: temperature control (18-25°C), humidity management (40-60% RH), surface preparation techniques, and quality verification methods...",
        "category": "Process Optimization",
        "tags": ["adhesive", "best-practices", "process"],
        "author": "Process Engineering Team",
        "relatedDefects": [],
        "created_date": datetime.now() - timedelta(days=45),
        "updated_date": datetime.now() - timedelta(days=45)
    }
]

result = db.knowledge_documents.insert_many(knowledge)
print(f"✅ Imported {len(result.inserted_ids)} Knowledge Documents")

print("\n" + "="*60)
print("✅ IMPORT COMPLETE!")
print("="*60)
print("\nData imported successfully!")
print("\n📊 Summary:")
print(f"  • {len(complaints)} Customer Complaints")
print(f"  • {len(defects)} Defect Tickets")
print(f"  • {len(runs)} Process Runs")
print(f"  • {len(golden)} Golden Batches")
print(f"  • {len(sops)} SOPs")
print(f"  • {len(knowledge)} Knowledge Documents")
print("\n🔐 Login with:")
print("  Email: shubhrangshub@gmail.com")
print("  Password: admin123")
print("  Role: Admin (full access)")
print("\n")
