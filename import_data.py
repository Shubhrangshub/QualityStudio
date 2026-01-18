#!/usr/bin/env python3
"""
Import sample data into Quality Studio
This creates realistic data for all entities
"""
import requests
import json
from datetime import datetime, timedelta
import random

API_BASE = "http://localhost:8001/api"

# Sample data for Customer Complaints
customer_complaints = [
    {
        "ticketNumber": "COMP-2001",
        "dateLogged": (datetime.now() - timedelta(days=15)).isoformat(),
        "customerName": "Acme Corporation",
        "productType": "Window Film",
        "complaintDescription": "Film shows bubbles after installation in high humidity conditions",
        "severity": "high",
        "status": "under_investigation",
        "assignedTo": "John Doe",
        "qfirCompleted": True
    },
    {
        "ticketNumber": "COMP-2002",
        "dateLogged": (datetime.now() - timedelta(days=12)).isoformat(),
        "customerName": "GlobalTech Industries",
        "productType": "PPF",
        "complaintDescription": "Delamination observed on vehicle hood after 6 months",
        "severity": "critical",
        "status": "resolved",
        "assignedTo": "Jane Smith",
        "qfirCompleted": True
    },
    {
        "ticketNumber": "COMP-2003",
        "dateLogged": (datetime.now() - timedelta(days=8)).isoformat(),
        "customerName": "Metro Auto Group",
        "productType": "Window Film",
        "complaintDescription": "Haze appearance after 3 weeks of application",
        "severity": "medium",
        "status": "pending_qfir",
        "assignedTo": "Bob Johnson",
        "qfirCompleted": False
    },
    {
        "ticketNumber": "COMP-2004",
        "dateLogged": (datetime.now() - timedelta(days=5)).isoformat(),
        "customerName": "Prime Buildings Ltd",
        "productType": "Window Film",
        "complaintDescription": "Scratches visible on multiple panels",
        "severity": "low",
        "status": "under_investigation",
        "assignedTo": "Jane Smith",
        "qfirCompleted": False
    },
    {
        "ticketNumber": "COMP-2005",
        "dateLogged": (datetime.now() - timedelta(days=3)).isoformat(),
        "customerName": "Elite Motors",
        "productType": "PPF",
        "complaintDescription": "Orange peel texture on front bumper",
        "severity": "medium",
        "status": "pending_qfir",
        "assignedTo": "John Doe",
        "qfirCompleted": False
    }
]

# Sample data for Defect Tickets
defect_tickets = [
    {
        "ticketId": "DEF-1001",
        "dateTime": (datetime.now() - timedelta(days=14)).isoformat(),
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
        "rootCause": "Material moisture content exceeded specification"
    },
    {
        "ticketId": "DEF-1002",
        "dateTime": (datetime.now() - timedelta(days=13)).isoformat(),
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
        "rootCause": "Insufficient adhesive curing temperature"
    },
    {
        "ticketId": "DEF-1003",
        "dateTime": (datetime.now() - timedelta(days=11)).isoformat(),
        "line": "Line 1",
        "lane": "Lane C",
        "webPositionMD": "3500",
        "webPositionCD": "800",
        "shift": "Night",
        "defectType": "haze",
        "severity": "minor",
        "status": "closed",
        "inspectionMethod": "visual",
        "description": "Slight haze visible under inspection lamp, does not affect clarity significantly",
        "images": []
    },
    {
        "ticketId": "DEF-1004",
        "dateTime": (datetime.now() - timedelta(days=10)).isoformat(),
        "line": "Line 3",
        "lane": "Lane A",
        "webPositionMD": "1800",
        "webPositionCD": "600",
        "shift": "Morning",
        "defectType": "scratches",
        "severity": "major",
        "status": "rca_in_progress",
        "inspectionMethod": "visual",
        "description": "Linear scratch pattern, approximately 150mm long, 0.5mm wide",
        "images": [],
        "rootCause": "Worn roller guide bearing"
    },
    {
        "ticketId": "DEF-1005",
        "dateTime": (datetime.now() - timedelta(days=8)).isoformat(),
        "line": "Line 2",
        "lane": "Lane B",
        "webPositionMD": "4200",
        "webPositionCD": "700",
        "shift": "Afternoon",
        "defectType": "fisheyes",
        "severity": "minor",
        "status": "open",
        "inspectionMethod": "visual",
        "description": "Small fisheye defects, 3-4 per meter, approximately 1mm diameter",
        "images": []
    },
    {
        "ticketId": "DEF-1006",
        "dateTime": (datetime.now() - timedelta(days=7)).isoformat(),
        "line": "Line 1",
        "lane": "Lane C",
        "webPositionMD": "2800",
        "webPositionCD": "550",
        "shift": "Morning",
        "defectType": "gels_contamination",
        "severity": "major",
        "status": "open",
        "inspectionMethod": "microscope",
        "description": "Gel particles visible, suspected contamination in raw material",
        "images": []
    }
]

# Sample data for RCA Records
rca_records = [
    {
        "defectTicketId": "DEF-1001",
        "analysisType": "5whys",
        "ishikawaData": {
            "problem": "Bubbles in film product",
            "categories": {
                "material": ["High moisture content", "Improper storage"],
                "machine": ["Drying system malfunction"],
                "method": ["Insufficient drying time"],
                "environment": ["High ambient humidity"]
            }
        },
        "fiveWhysData": [
            {"why": 1, "question": "Why are there bubbles?", "answer": "Moisture trapped in material"},
            {"why": 2, "question": "Why is moisture trapped?", "answer": "Material not dried properly"},
            {"why": 3, "question": "Why wasn't it dried properly?", "answer": "Dryer temperature below specification"},
            {"why": 4, "question": "Why was temperature below spec?", "answer": "Heating element degraded"},
            {"why": 5, "question": "Why wasn't it replaced?", "answer": "Preventive maintenance schedule delayed"}
        ],
        "rootCause": "Material moisture content exceeded specification due to degraded heating element in drying system",
        "contributingFactors": ["High ambient humidity", "Delayed preventive maintenance"],
        "status": "completed"
    },
    {
        "defectTicketId": "DEF-1002",
        "analysisType": "ishikawa",
        "ishikawaData": {
            "problem": "Delamination at adhesive interface",
            "categories": {
                "material": ["Adhesive batch variation"],
                "machine": ["Oven temperature drift"],
                "method": ["Insufficient curing time"],
                "measurement": ["Temperature sensor calibration"]
            }
        },
        "rootCause": "Insufficient adhesive curing temperature - oven temperature 15°C below specification",
        "contributingFactors": ["Temperature sensor calibration drift", "Operator did not verify temperature"],
        "status": "completed"
    }
]

# Sample data for CAPA Plans
capa_plans = [
    {
        "defectTicketId": "DEF-1001",
        "rcaRecordId": "RCA-1001",
        "correctiveActions": [
            {
                "action": "Replace degraded heating element in drying system",
                "owner": "Maintenance Team",
                "dueDate": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": "completed",
                "completionDate": (datetime.now() - timedelta(days=1)).isoformat()
            },
            {
                "action": "Implement hourly temperature monitoring",
                "owner": "Production Supervisor",
                "dueDate": (datetime.now() + timedelta(days=3)).isoformat(),
                "status": "in_progress"
            }
        ],
        "preventiveActions": [
            {
                "action": "Update preventive maintenance schedule for heating elements (quarterly)",
                "owner": "Maintenance Manager",
                "dueDate": (datetime.now() + timedelta(days=14)).isoformat(),
                "status": "planned"
            },
            {
                "action": "Install automated temperature monitoring with alerts",
                "owner": "Engineering Team",
                "dueDate": (datetime.now() + timedelta(days=30)).isoformat(),
                "status": "planned"
            }
        ],
        "approvalState": "approved",
        "effectiveness": {
            "measured": True,
            "effectiveDate": (datetime.now() + timedelta(days=45)).isoformat(),
            "result": "pending"
        }
    },
    {
        "defectTicketId": "DEF-1002",
        "rcaRecordId": "RCA-1002",
        "correctiveActions": [
            {
                "action": "Calibrate oven temperature sensors",
                "owner": "Quality Team",
                "dueDate": (datetime.now() + timedelta(days=2)).isoformat(),
                "status": "in_progress"
            },
            {
                "action": "Verify curing temperature hourly for next week",
                "owner": "Production Team",
                "dueDate": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": "in_progress"
            }
        ],
        "preventiveActions": [
            {
                "action": "Implement monthly sensor calibration verification",
                "owner": "Quality Manager",
                "dueDate": (datetime.now() + timedelta(days=21)).isoformat(),
                "status": "draft"
            }
        ],
        "approvalState": "under_review"
    }
]

# Sample data for Process Runs
process_runs = [
    {
        "runId": f"RUN-{3000 + i}",
        "dateTimeStart": (datetime.now() - timedelta(hours=i*4)).isoformat(),
        "dateTimeEnd": (datetime.now() - timedelta(hours=i*4-2)).isoformat(),
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
        }
    }
    for i in range(25)
]

# Sample data for Golden Batches
golden_batches = [
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
        "dateCreated": (datetime.now() - timedelta(days=90)).isoformat(),
        "isActive": True
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
        "dateCreated": (datetime.now() - timedelta(days=120)).isoformat(),
        "isActive": True
    }
]

# Sample data for SOPs
sops = [
    {
        "sopNumber": "SOP-001",
        "title": "Material Receiving and Storage Procedure",
        "version": "2.1",
        "department": "Quality Control",
        "content": "This SOP defines the procedures for receiving, inspecting, and storing raw materials...",
        "effectiveDate": (datetime.now() - timedelta(days=180)).isoformat(),
        "status": "active"
    },
    {
        "sopNumber": "SOP-002",
        "title": "Defect Identification and Classification",
        "version": "3.0",
        "department": "Quality Control",
        "content": "This SOP provides guidelines for identifying and classifying defects in film products...",
        "effectiveDate": (datetime.now() - timedelta(days=150)).isoformat(),
        "status": "active"
    },
    {
        "sopNumber": "SOP-003",
        "title": "Root Cause Analysis Procedure",
        "version": "1.5",
        "department": "Quality Engineering",
        "content": "This SOP describes the methodology for conducting root cause analysis using 5 Whys and Ishikawa diagrams...",
        "effectiveDate": (datetime.now() - timedelta(days=120)).isoformat(),
        "status": "active"
    }
]

# Sample data for Knowledge Documents
knowledge_documents = [
    {
        "title": "Common Causes of Bubbles in Window Films",
        "content": "This document summarizes common root causes of bubble defects including: 1) High moisture content in material, 2) Insufficient drying, 3) Contamination, 4) Temperature variations...",
        "category": "Defect Analysis",
        "tags": ["bubbles", "defects", "troubleshooting"],
        "author": "Quality Engineering Team"
    },
    {
        "title": "Best Practices for Adhesive Application",
        "content": "Guidelines for optimal adhesive application including temperature control, humidity management, and surface preparation techniques...",
        "category": "Process Optimization",
        "tags": ["adhesive", "best-practices", "process"],
        "author": "Process Engineering Team"
    }
]

# Function to post data
def post_data(endpoint, data_list, entity_name):
    print(f"\n{'='*60}")
    print(f"Importing {entity_name}...")
    print(f"{'='*60}")
    success_count = 0
    for item in data_list:
        try:
            response = requests.post(f"{API_BASE}/{endpoint}", json=item)
            if response.status_code == 200:
                print(f"✅ Created {entity_name}: {item.get('ticketId') or item.get('ticketNumber') or item.get('runId') or item.get('batchId') or item.get('sopNumber') or item.get('title', 'Item')}")
                success_count += 1
            else:
                print(f"❌ Failed: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n📊 Imported {success_count}/{len(data_list)} {entity_name}")
    return success_count

# Main import function
def main():
    print("\n" + "="*60)
    print("QUALITY STUDIO - DATA IMPORT SCRIPT")
    print("="*60)
    
    total_imported = 0
    
    # Import all data
    total_imported += post_data("customer_complaints", customer_complaints, "Customer Complaints")
    total_imported += post_data("defect_tickets", defect_tickets, "Defect Tickets")
    total_imported += post_data("rca_records", rca_records, "RCA Records")
    total_imported += post_data("capa_plans", capa_plans, "CAPA Plans")
    total_imported += post_data("process_runs", process_runs, "Process Runs")
    total_imported += post_data("golden_batches", golden_batches, "Golden Batches")
    total_imported += post_data("sops", sops, "SOPs")
    total_imported += post_data("knowledge_documents", knowledge_documents, "Knowledge Documents")
    
    print("\n" + "="*60)
    print(f"✅ IMPORT COMPLETE! Total records imported: {total_imported}")
    print("="*60)
    print("\nYou can now:")
    print("1. View the data in the Quality Studio app")
    print("2. Login with: shubhrangshub@gmail.com / admin123")
    print("3. Navigate through all pages to see the imported data")
    print("\n")

if __name__ == "__main__":
    main()
