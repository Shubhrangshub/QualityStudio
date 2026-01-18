"""
Backend API Tests for QualityStudio
Tests all CRUD operations for entities and AI endpoints
"""
import pytest
import requests
import os
import json
from datetime import datetime

# Use the public URL for testing
BASE_URL = os.environ.get('VITE_API_BASE_URL', 'http://localhost:8001/api')

# Test credentials
ADMIN_EMAIL = "shubhrangshub@gmail.com"
ADMIN_PASSWORD = "admin123"
INSPECTOR_EMAIL = "inspector@qualitystudio.com"
INSPECTOR_PASSWORD = "inspector123"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ Health check passed - API and database connected")
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        # Remove /api from BASE_URL for root
        root_url = BASE_URL.replace('/api', '')
        response = requests.get(f"{root_url}/")
        assert response.status_code == 200
        data = response.json()
        assert "Quality Studio API" in data.get("message", "")
        print("✓ Root endpoint working")
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - User: {data['user']['name']}")
    
    def test_login_inspector_success(self):
        """Test inspector login with valid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": INSPECTOR_EMAIL,
            "password": INSPECTOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "quality_inspector"
        print("✓ Inspector login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 400
        print("✓ Missing password correctly rejected")
    
    def test_get_demo_users(self):
        """Test demo users endpoint"""
        response = requests.get(f"{BASE_URL}/auth/demo-users")
        assert response.status_code == 200
        data = response.json()
        assert "admin" in data or "primary_admin" in data
        print("✓ Demo users endpoint working")
    
    def test_get_roles(self):
        """Test roles endpoint"""
        response = requests.get(f"{BASE_URL}/auth/roles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("✓ Roles endpoint working")


class TestStatistics:
    """Statistics endpoint tests"""
    
    def test_get_statistics(self):
        """Test statistics endpoint returns correct counts"""
        response = requests.get(f"{BASE_URL}/statistics")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected collections are present
        expected_collections = [
            "CustomerComplaint", "DefectTicket", "RCARecord", 
            "CAPAPlan", "ProcessRun", "GoldenBatch", "SOP", "KPI"
        ]
        for collection in expected_collections:
            assert collection in data, f"Missing {collection} in statistics"
        
        print(f"✓ Statistics: {json.dumps(data, indent=2)}")


class TestCustomerComplaints:
    """Customer Complaints CRUD tests"""
    
    created_id = None
    
    def test_list_customer_complaints(self):
        """Test listing customer complaints"""
        response = requests.get(f"{BASE_URL}/customer_complaints")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} customer complaints")
    
    def test_create_customer_complaint(self):
        """Test creating a customer complaint"""
        payload = {
            "ticketNumber": f"TEST-CC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "customerName": "TEST_Customer Corp",
            "productType": "Window Film",
            "complaintDescription": "Test complaint for automated testing",
            "severity": "major",
            "status": "pending_qfir"
        }
        response = requests.post(f"{BASE_URL}/customer_complaints", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["customerName"] == payload["customerName"]
        TestCustomerComplaints.created_id = data["id"]
        print(f"✓ Created customer complaint: {data['id']}")
    
    def test_get_customer_complaint_by_id(self):
        """Test getting a specific customer complaint"""
        if not TestCustomerComplaints.created_id:
            pytest.skip("No complaint created to fetch")
        
        response = requests.get(f"{BASE_URL}/customer_complaints/{TestCustomerComplaints.created_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestCustomerComplaints.created_id
        print(f"✓ Fetched customer complaint by ID")
    
    def test_update_customer_complaint(self):
        """Test updating a customer complaint"""
        if not TestCustomerComplaints.created_id:
            pytest.skip("No complaint created to update")
        
        update_payload = {
            "status": "qfir_completed",
            "severity": "critical"
        }
        response = requests.put(
            f"{BASE_URL}/customer_complaints/{TestCustomerComplaints.created_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "qfir_completed"
        print(f"✓ Updated customer complaint status")
    
    def test_filter_customer_complaints(self):
        """Test filtering customer complaints"""
        response = requests.post(
            f"{BASE_URL}/customer_complaints/filter",
            json={"status": "pending_qfir"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Filtered complaints: {len(data)} results")
    
    def test_delete_customer_complaint(self):
        """Test deleting a customer complaint"""
        if not TestCustomerComplaints.created_id:
            pytest.skip("No complaint created to delete")
        
        response = requests.delete(f"{BASE_URL}/customer_complaints/{TestCustomerComplaints.created_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/customer_complaints/{TestCustomerComplaints.created_id}")
        assert get_response.status_code == 404
        print(f"✓ Deleted customer complaint and verified removal")


class TestDefectTickets:
    """Defect Tickets CRUD tests"""
    
    created_id = None
    
    def test_list_defect_tickets(self):
        """Test listing defect tickets"""
        response = requests.get(f"{BASE_URL}/defect_tickets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} defect tickets")
    
    def test_create_defect_ticket(self):
        """Test creating a defect ticket"""
        payload = {
            "ticketId": f"TEST-DT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "line": "Line 1",
            "lane": "A",
            "shift": "A",
            "defectType": "bubbles_voids",
            "severity": "major",
            "status": "open",
            "inspectionMethod": "visual",
            "description": "Test defect for automated testing"
        }
        response = requests.post(f"{BASE_URL}/defect_tickets", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["defectType"] == payload["defectType"]
        TestDefectTickets.created_id = data["id"]
        print(f"✓ Created defect ticket: {data['id']}")
    
    def test_get_defect_ticket_by_id(self):
        """Test getting a specific defect ticket"""
        if not TestDefectTickets.created_id:
            pytest.skip("No defect created to fetch")
        
        response = requests.get(f"{BASE_URL}/defect_tickets/{TestDefectTickets.created_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestDefectTickets.created_id
        print(f"✓ Fetched defect ticket by ID")
    
    def test_update_defect_ticket(self):
        """Test updating a defect ticket"""
        if not TestDefectTickets.created_id:
            pytest.skip("No defect created to update")
        
        update_payload = {
            "status": "rca_in_progress",
            "rootCause": "Material contamination"
        }
        response = requests.put(
            f"{BASE_URL}/defect_tickets/{TestDefectTickets.created_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rca_in_progress"
        print(f"✓ Updated defect ticket status")
    
    def test_delete_defect_ticket(self):
        """Test deleting a defect ticket"""
        if not TestDefectTickets.created_id:
            pytest.skip("No defect created to delete")
        
        response = requests.delete(f"{BASE_URL}/defect_tickets/{TestDefectTickets.created_id}")
        assert response.status_code == 200
        print(f"✓ Deleted defect ticket")


class TestRCARecords:
    """RCA Records CRUD tests"""
    
    created_id = None
    
    def test_list_rca_records(self):
        """Test listing RCA records"""
        response = requests.get(f"{BASE_URL}/rca_records")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} RCA records")
    
    def test_create_rca_record(self):
        """Test creating an RCA record"""
        payload = {
            "analysisType": "5_whys",
            "rootCause": "Test root cause for automated testing",
            "contributingFactors": ["Factor 1", "Factor 2"],
            "status": "in_progress"
        }
        response = requests.post(f"{BASE_URL}/rca_records", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestRCARecords.created_id = data["id"]
        print(f"✓ Created RCA record: {data['id']}")
    
    def test_delete_rca_record(self):
        """Test deleting an RCA record"""
        if not TestRCARecords.created_id:
            pytest.skip("No RCA created to delete")
        
        response = requests.delete(f"{BASE_URL}/rca_records/{TestRCARecords.created_id}")
        assert response.status_code == 200
        print(f"✓ Deleted RCA record")


class TestCAPAPlans:
    """CAPA Plans CRUD tests"""
    
    created_id = None
    
    def test_list_capa_plans(self):
        """Test listing CAPA plans"""
        response = requests.get(f"{BASE_URL}/capa_plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} CAPA plans")
    
    def test_create_capa_plan(self):
        """Test creating a CAPA plan"""
        payload = {
            "correctiveActions": [{"action": "Test corrective action", "status": "pending"}],
            "preventiveActions": [{"action": "Test preventive action", "status": "pending"}],
            "approvalState": "draft"
        }
        response = requests.post(f"{BASE_URL}/capa_plans", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestCAPAPlans.created_id = data["id"]
        print(f"✓ Created CAPA plan: {data['id']}")
    
    def test_delete_capa_plan(self):
        """Test deleting a CAPA plan"""
        if not TestCAPAPlans.created_id:
            pytest.skip("No CAPA created to delete")
        
        response = requests.delete(f"{BASE_URL}/capa_plans/{TestCAPAPlans.created_id}")
        assert response.status_code == 200
        print(f"✓ Deleted CAPA plan")


class TestProcessRuns:
    """Process Runs CRUD tests"""
    
    created_id = None
    
    def test_list_process_runs(self):
        """Test listing process runs"""
        response = requests.get(f"{BASE_URL}/process_runs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} process runs")
    
    def test_create_process_run(self):
        """Test creating a process run"""
        payload = {
            "runId": f"TEST-PR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "line": "Line 1",
            "materialType": "PET Film",
            "parameters": {"speed": 100, "temperature": 150}
        }
        response = requests.post(f"{BASE_URL}/process_runs", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestProcessRuns.created_id = data["id"]
        print(f"✓ Created process run: {data['id']}")
    
    def test_delete_process_run(self):
        """Test deleting a process run"""
        if not TestProcessRuns.created_id:
            pytest.skip("No process run created to delete")
        
        response = requests.delete(f"{BASE_URL}/process_runs/{TestProcessRuns.created_id}")
        assert response.status_code == 200
        print(f"✓ Deleted process run")


class TestGoldenBatches:
    """Golden Batches CRUD tests"""
    
    def test_list_golden_batches(self):
        """Test listing golden batches"""
        response = requests.get(f"{BASE_URL}/golden_batches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} golden batches")


class TestSOPs:
    """SOPs CRUD tests"""
    
    def test_list_sops(self):
        """Test listing SOPs"""
        response = requests.get(f"{BASE_URL}/sops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} SOPs")


class TestKPIs:
    """KPIs CRUD tests"""
    
    def test_list_kpis(self):
        """Test listing KPIs"""
        response = requests.get(f"{BASE_URL}/kpis")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} KPIs")


class TestKnowledgeDocuments:
    """Knowledge Documents CRUD tests"""
    
    def test_list_knowledge_documents(self):
        """Test listing knowledge documents"""
        response = requests.get(f"{BASE_URL}/knowledge_documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} knowledge documents")


class TestAIEndpoints:
    """AI Service endpoint tests"""
    
    def test_rca_suggestions(self):
        """Test AI RCA suggestions endpoint"""
        payload = {
            "description": "Bubbles appearing in the film during lamination process",
            "defectType": "bubbles_voids",
            "severity": "major"
        }
        response = requests.post(f"{BASE_URL}/ai/rca-suggestions", json=payload, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) > 0
        print(f"✓ AI RCA suggestions: {len(data['suggestions'])} suggestions received")
        print(f"  Model: {data.get('model', 'unknown')}")
    
    def test_classify_defect(self):
        """Test AI defect classification endpoint"""
        payload = {
            "description": "Small circular spots with contamination visible under microscope"
        }
        response = requests.post(f"{BASE_URL}/ai/classify-defect", json=payload, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "defect_type" in data
        assert "confidence" in data
        print(f"✓ AI classification: {data['defect_type']} (confidence: {data['confidence']})")
    
    def test_generate_capa(self):
        """Test AI CAPA generation endpoint"""
        payload = {
            "rootCause": "Contamination in raw material batch",
            "defectType": "gels_contamination"
        }
        response = requests.post(f"{BASE_URL}/ai/generate-capa", json=payload, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "corrective_actions" in data
        assert "preventive_actions" in data
        print(f"✓ AI CAPA generated: {len(data['corrective_actions'])} corrective, {len(data['preventive_actions'])} preventive actions")


class TestEquipment:
    """Equipment CRUD tests"""
    
    def test_list_equipment(self):
        """Test listing equipment"""
        response = requests.get(f"{BASE_URL}/equipment")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} equipment items")


class TestDoE:
    """DoE (Design of Experiments) CRUD tests"""
    
    def test_list_does(self):
        """Test listing DoEs"""
        response = requests.get(f"{BASE_URL}/does")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} DoE records")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
