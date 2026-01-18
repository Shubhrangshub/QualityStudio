#!/usr/bin/env python3
"""
Import REAL production data from database export
This will replace demo data with actual historical records
"""
from pymongo import MongoClient
from datetime import datetime
import json

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["quality_studio"]

print("\n" + "="*60)
print("QUALITY STUDIO - IMPORTING REAL PRODUCTION DATA")
print("="*60 + "\n")

# Load the export file
print("Loading database export...")
with open('/app/database-export-original.json', 'r') as f:
    data = json.load(f)

print(f"✓ Loaded export from: {data['exportDate']}\n")

# Clear existing data
print("Clearing existing demo data...")
for collection in ["customer_complaints", "defect_tickets", "rca_records", "capa_plans", 
                   "process_runs", "golden_batches", "sops", "does",
                   "knowledge_documents", "equipment", "file_upload_history"]:
    result = db[collection].delete_many({})
    print(f"  Cleared {result.deleted_count} records from {collection}")

print("\n" + "-"*60)
print("Importing real production data...")
print("-"*60 + "\n")

entities = data['entities']
total_imported = 0

# Helper function to convert date strings to datetime
def convert_dates(obj):
    """Recursively convert ISO date strings to datetime objects"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str) and 'T' in value and value.endswith('Z'):
                try:
                    obj[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
            elif isinstance(value, (dict, list)):
                obj[key] = convert_dates(value)
        return obj
    elif isinstance(obj, list):
        return [convert_dates(item) for item in obj]
    return obj

# Import each entity type
collection_mapping = {
    "CustomerComplaint": "customer_complaints",
    "DefectTicket": "defect_tickets",
    "RCARecord": "rca_records",
    "CAPAPlan": "capa_plans",
    "ProcessRun": "process_runs",
    "GoldenBatch": "golden_batches",
    "SOP": "sops",
    "DoE": "does",
    "KnowledgeDocument": "knowledge_documents",
    "Equipment": "equipment",
    "FileUploadHistory": "file_upload_history"
}

for entity_name, collection_name in collection_mapping.items():
    records = entities.get(entity_name, [])
    
    if not records:
        print(f"⊘ {entity_name:30} - No records to import")
        continue
    
    # Convert date strings to datetime objects
    records_with_dates = [convert_dates(record) for record in records]
    
    # Add created_date and updated_date if not present
    for record in records_with_dates:
        if 'created_date' not in record:
            record['created_date'] = datetime.utcnow()
        if 'updated_date' not in record:
            record['updated_date'] = datetime.utcnow()
    
    # Insert into MongoDB
    try:
        result = db[collection_name].insert_many(records_with_dates)
        count = len(result.inserted_ids)
        total_imported += count
        print(f"✓ {entity_name:30} {count:>3} records imported")
    except Exception as e:
        print(f"✗ {entity_name:30} ERROR: {str(e)[:50]}")

print("\n" + "="*60)
print(f"✓ IMPORT COMPLETE!")
print("="*60)
print(f"\nTotal records imported: {total_imported}")

# Show sample data
print("\n" + "-"*60)
print("Sample Records:")
print("-"*60)

# Show customer complaints
complaints = list(db.customer_complaints.find().limit(2))
if complaints:
    print(f"\n✓ Customer Complaints ({len(complaints)} shown):")
    for c in complaints:
        print(f"  • {c.get('ticketNumber')} - {c.get('customerName')} - {c.get('issueDescription')[:50]}...")

# Show defect tickets
defects = list(db.defect_tickets.find().limit(2))
if defects:
    print(f"\n✓ Defect Tickets ({len(defects)} shown):")
    for d in defects:
        print(f"  • {d.get('ticketId')} - {d.get('defectType')} - {d.get('severity')}")

# Show RCA records
rcas = list(db.rca_records.find().limit(2))
if rcas:
    print(f"\n✓ RCA Records ({len(rcas)} shown):")
    for r in rcas:
        print(f"  • Defect: {r.get('defectTicketId')} - Status: {r.get('status')}")

# Show CAPA plans
capas = list(db.capa_plans.find().limit(2))
if capas:
    print(f"\n✓ CAPA Plans ({len(capas)} shown):")
    for c in capas:
        actions = len(c.get('correctiveActions', []))
        print(f"  • Defect: {c.get('defectTicketId')} - {actions} corrective actions")

print("\n" + "="*60)
print("✓ Real production data is now in the database!")
print("="*60)
print("\nYou can now:")
print("1. Refresh your preview to see real data")
print("2. Navigate through the app to view actual records")
print("3. Deploy with confidence - this is production data!")
print("\n")
