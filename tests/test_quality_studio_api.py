# QualityStudio API Tests - Post Base44 Refactoring
# Tests all core functionality after removing Base44 platform references

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001/api').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ Health check passed")
    
    def test_demo_users_endpoint(self):
        """Test demo users endpoint returns all demo accounts"""
        response = requests.get(f"{BASE_URL}/auth/demo-users")
        assert response.status_code == 200
        data = response.json()
        assert "primary_admin" in data
        assert "admin" in data
        assert "quality_inspector" in data
        assert "quality_engineer" in data
        assert "sales" in data
        assert "operator" in data
        print("✓ Demo users endpoint passed")
    
    def test_login_admin(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "shubhrangshub@gmail.com"
        print("✓ Admin login passed")
    
    def test_login_inspector(self):
        """Test inspector login"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "inspector@qualitystudio.com",
            "password": "inspector123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "quality_inspector"
        print("✓ Inspector login passed")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")
    
    def test_token_validation(self):
        """Test token validation endpoint"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        token = login_response.json()["access_token"]
        
        # Validate token
        response = requests.post(f"{BASE_URL}/auth/validate-token", json={
            "token": token
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["user"]["email"] == "shubhrangshub@gmail.com"
        print("✓ Token validation passed")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "shubhrangshub@gmail.com"
        assert data["role"] == "admin"
        print("✓ Get current user passed")


class TestDefectTickets:
    """Defect tickets CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_defect_tickets(self, auth_token):
        """Test listing defect tickets"""
        response = requests.get(f"{BASE_URL}/defect_tickets", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List defect tickets passed - {len(data)} tickets found")
    
    def test_create_defect_ticket(self, auth_token):
        """Test creating a defect ticket"""
        response = requests.post(f"{BASE_URL}/defect_tickets", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "ticketId": "TEST_DEF_001",
                "line": "Line-1",
                "defectType": "Scratch",
                "severity": "major",
                "status": "open",
                "description": "Test defect for API testing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ticketId"] == "TEST_DEF_001"
        assert "id" in data
        print(f"✓ Create defect ticket passed - ID: {data['id']}")
        return data["id"]
    
    def test_get_defect_ticket(self, auth_token):
        """Test getting a specific defect ticket"""
        # First create one
        create_response = requests.post(f"{BASE_URL}/defect_tickets",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "ticketId": "TEST_DEF_GET",
                "line": "Line-2",
                "defectType": "Contamination",
                "severity": "minor",
                "status": "open"
            }
        )
        ticket_id = create_response.json()["id"]
        
        # Get it
        response = requests.get(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ticketId"] == "TEST_DEF_GET"
        print("✓ Get defect ticket passed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_defect_ticket(self, auth_token):
        """Test updating a defect ticket"""
        # Create
        create_response = requests.post(f"{BASE_URL}/defect_tickets",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "ticketId": "TEST_DEF_UPDATE",
                "status": "open",
                "severity": "minor"
            }
        )
        ticket_id = create_response.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "status": "closed",
                "severity": "major",
                "rootCause": "Material defect"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "closed"
        assert data["severity"] == "major"
        print("✓ Update defect ticket passed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_delete_defect_ticket(self, auth_token):
        """Test deleting a defect ticket"""
        # Create
        create_response = requests.post(f"{BASE_URL}/defect_tickets",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"ticketId": "TEST_DEF_DELETE"}
        )
        ticket_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/defect_tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404
        print("✓ Delete defect ticket passed")


class TestCustomerComplaints:
    """Customer complaints CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_customer_complaints(self, auth_token):
        """Test listing customer complaints"""
        response = requests.get(f"{BASE_URL}/customer_complaints", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List customer complaints passed - {len(data)} complaints found")
    
    def test_create_customer_complaint(self, auth_token):
        """Test creating a customer complaint"""
        response = requests.post(f"{BASE_URL}/customer_complaints",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "ticketNumber": "TEST_COMP_001",
                "customerName": "Test Customer",
                "productType": "Film",
                "complaintDescription": "Test complaint for API testing",
                "severity": "major",
                "status": "pending_qfir"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ticketNumber"] == "TEST_COMP_001"
        assert "id" in data
        print(f"✓ Create customer complaint passed - ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/customer_complaints/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestRCARecords:
    """RCA records tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_rca_records(self, auth_token):
        """Test listing RCA records"""
        response = requests.get(f"{BASE_URL}/rca_records", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List RCA records passed - {len(data)} records found")
    
    def test_create_rca_record(self, auth_token):
        """Test creating an RCA record"""
        response = requests.post(f"{BASE_URL}/rca_records",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "defectTicketId": "TEST_DEF_001",
                "analysisType": "5_whys",
                "rootCause": "Test root cause",
                "status": "in_progress"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Create RCA record passed - ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/rca_records/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestCAPAPlans:
    """CAPA plans tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_capa_plans(self, auth_token):
        """Test listing CAPA plans"""
        response = requests.get(f"{BASE_URL}/capa_plans", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List CAPA plans passed - {len(data)} plans found")


class TestStatistics:
    """Statistics endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_statistics(self, auth_token):
        """Test statistics endpoint"""
        response = requests.get(f"{BASE_URL}/statistics", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "DefectTicket" in data
        assert "CustomerComplaint" in data
        assert "RCARecord" in data
        assert "CAPAPlan" in data
        print(f"✓ Statistics passed - Defects: {data['DefectTicket']}, Complaints: {data['CustomerComplaint']}")


class TestAIEndpoints:
    """AI service endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_rca_suggestions(self, auth_token):
        """Test AI RCA suggestions endpoint"""
        response = requests.post(f"{BASE_URL}/ai/rca-suggestions",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "description": "Surface scratches on film product",
                "defectType": "Scratch",
                "severity": "major"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data or "root_causes" in data or isinstance(data, dict)
        print("✓ AI RCA suggestions passed")
    
    def test_classify_defect(self, auth_token):
        """Test AI defect classification endpoint"""
        response = requests.post(f"{BASE_URL}/ai/classify-defect",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "description": "Dark spots visible on the surface of the film"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("✓ AI classify defect passed")
    
    def test_generate_capa(self, auth_token):
        """Test AI CAPA generation endpoint"""
        response = requests.post(f"{BASE_URL}/ai/generate-capa",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "rootCause": "Contaminated raw material",
                "defectType": "Contamination"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("✓ AI generate CAPA passed")


class TestOtherEntities:
    """Tests for other entity endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "shubhrangshub@gmail.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_process_runs(self, auth_token):
        """Test listing process runs"""
        response = requests.get(f"{BASE_URL}/process_runs", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List process runs passed - {len(response.json())} runs")
    
    def test_list_golden_batches(self, auth_token):
        """Test listing golden batches"""
        response = requests.get(f"{BASE_URL}/golden_batches", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List golden batches passed - {len(response.json())} batches")
    
    def test_list_sops(self, auth_token):
        """Test listing SOPs"""
        response = requests.get(f"{BASE_URL}/sops", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List SOPs passed - {len(response.json())} SOPs")
    
    def test_list_kpis(self, auth_token):
        """Test listing KPIs"""
        response = requests.get(f"{BASE_URL}/kpis", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List KPIs passed - {len(response.json())} KPIs")
    
    def test_list_equipment(self, auth_token):
        """Test listing equipment"""
        response = requests.get(f"{BASE_URL}/equipment", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List equipment passed - {len(response.json())} items")
    
    def test_list_knowledge_documents(self, auth_token):
        """Test listing knowledge documents"""
        response = requests.get(f"{BASE_URL}/knowledge_documents", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"✓ List knowledge documents passed - {len(response.json())} docs")


# Cleanup test data
def cleanup_test_data():
    """Clean up any test data created during tests"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "shubhrangshub@gmail.com",
        "password": "admin123"
    })
    if response.status_code != 200:
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Clean up test defect tickets
    defects = requests.get(f"{BASE_URL}/defect_tickets", headers=headers).json()
    for defect in defects:
        if defect.get("ticketId", "").startswith("TEST_"):
            requests.delete(f"{BASE_URL}/defect_tickets/{defect['id']}", headers=headers)
    
    # Clean up test complaints
    complaints = requests.get(f"{BASE_URL}/customer_complaints", headers=headers).json()
    for complaint in complaints:
        if complaint.get("ticketNumber", "").startswith("TEST_"):
            requests.delete(f"{BASE_URL}/customer_complaints/{complaint['id']}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
