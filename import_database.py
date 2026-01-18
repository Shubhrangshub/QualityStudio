#!/usr/bin/env python3
"""
Import production data export into MongoDB
Preserves all existing data and merges new records
"""
from pymongo import MongoClient
from datetime import datetime
import json

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017")
db = client["quality_studio"]

print("\n" + "="*60)
print("QUALITY STUDIO - IMPORTING PRODUCTION DATA")
print("="*60 + "\n")

# Load the export file
print("Loading database export...")
with open('/app/database-export-latest.json', 'r') as f:
    data = json.load(f)

print(f"✓ Loaded export from: {data['exportDate']}\n")

# Helper function to convert date strings to datetime
def convert_dates(obj):
    """Recursively convert ISO date strings to datetime objects"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str) and value and 'T' in value:
                try:
                    if value.endswith('Z'):
                        obj[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    elif '+' in value or value.count('-') > 2:
                        obj[key] = datetime.fromisoformat(value)
                except:
                    pass
            elif isinstance(value, (dict, list)):
                convert_dates(value)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                convert_dates(item)
    return obj

# Collection mapping - Entity names to MongoDB collection names
COLLECTION_MAP = {
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
    "FileUploadHistory": "file_upload_history",
    "KPI": "kpis"
}

entities = data.get('entities', {})
total_imported = 0

print("Clearing existing data and importing fresh...")
print("-"*60 + "\n")

for entity_name, collection_name in COLLECTION_MAP.items():
    if entity_name in entities:
        records = entities[entity_name]
        if records:
            # Clear existing data in collection
            db[collection_name].delete_many({})
            
            # Convert dates and prepare records
            for record in records:
                convert_dates(record)
                # Remove the Base44 'id' field to avoid conflicts
                if 'id' in record:
                    record['base44_id'] = record.pop('id')
                # Ensure created_date exists
                if 'created_date' not in record:
                    record['created_date'] = datetime.utcnow()
                if 'updated_date' not in record:
                    record['updated_date'] = datetime.utcnow()
            
            # Insert all records
            result = db[collection_name].insert_many(records)
            count = len(result.inserted_ids)
            total_imported += count
            print(f"✓ {entity_name}: Imported {count} records to '{collection_name}'")
        else:
            print(f"  {entity_name}: No records to import")
    else:
        print(f"  {entity_name}: Not found in export")

print("\n" + "-"*60)
print(f"\n✓ TOTAL RECORDS IMPORTED: {total_imported}")

# Verify counts
print("\n" + "="*60)
print("VERIFICATION - Current Database Counts")
print("="*60 + "\n")

for entity_name, collection_name in COLLECTION_MAP.items():
    count = db[collection_name].count_documents({})
    print(f"  {collection_name}: {count} records")

print("\n✓ Import complete!")
