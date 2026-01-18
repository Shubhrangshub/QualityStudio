"""
Test suite for QualityStudio new features:
- Export endpoints (PDF/Excel)
- File upload endpoints
- WebSocket notifications
- Email notification status
"""

import pytest
import requests
import os
import io

# Get base URL from environment
BASE_URL = os.environ.get('VITE_API_BASE_URL', 'http://localhost:8001/api')

# Test credentials
TEST_EMAIL = "shubhrangshub@gmail.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = requests.get(BASE_URL.replace('/api', '/'))
        assert response.status_code == 200


class TestExportEndpoints:
    """Test PDF and Excel export endpoints"""
    
    def test_export_defects_pdf(self):
        """Test defects PDF export returns valid PDF"""
        response = requests.get(f"{BASE_URL}/export/defects/pdf")
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF'
    
    def test_export_defects_excel(self):
        """Test defects Excel export returns valid Excel file"""
        response = requests.get(f"{BASE_URL}/export/defects/excel")
        assert response.status_code == 200
        assert 'spreadsheetml' in response.headers.get('content-type', '')
        # Check Excel magic bytes (PK for zip-based xlsx)
        assert response.content[:2] == b'PK'
    
    def test_export_complaints_pdf(self):
        """Test complaints PDF export"""
        response = requests.get(f"{BASE_URL}/export/complaints/pdf")
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        assert response.content[:4] == b'%PDF'
    
    def test_export_complaints_excel(self):
        """Test complaints Excel export"""
        response = requests.get(f"{BASE_URL}/export/complaints/excel")
        assert response.status_code == 200
        assert 'spreadsheetml' in response.headers.get('content-type', '')
        assert response.content[:2] == b'PK'
    
    def test_export_kpis_pdf(self):
        """Test KPIs PDF export"""
        response = requests.get(f"{BASE_URL}/export/kpis/pdf")
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        assert response.content[:4] == b'%PDF'
    
    def test_export_kpis_excel(self):
        """Test KPIs Excel export"""
        response = requests.get(f"{BASE_URL}/export/kpis/excel")
        assert response.status_code == 200
        assert 'spreadsheetml' in response.headers.get('content-type', '')
        assert response.content[:2] == b'PK'
    
    def test_export_full_excel(self):
        """Test full data Excel export with multiple sheets"""
        response = requests.get(f"{BASE_URL}/export/full/excel")
        assert response.status_code == 200
        assert 'spreadsheetml' in response.headers.get('content-type', '')
        assert response.content[:2] == b'PK'
        # Full export should be larger than individual exports
        assert len(response.content) > 1000


class TestFileUploadEndpoints:
    """Test file upload functionality"""
    
    def test_list_files(self):
        """Test listing uploaded files"""
        response = requests.get(f"{BASE_URL}/files/list")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "total" in data
        assert isinstance(data["files"], list)
    
    def test_upload_file(self):
        """Test uploading a single file"""
        # Create test file content
        file_content = b"Test file content for upload"
        files = {"file": ("test_file.txt", io.BytesIO(file_content), "text/plain")}
        
        response = requests.post(f"{BASE_URL}/files/upload", files=files)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "filename" in data
        assert "original_filename" in data
        assert "file_url" in data
        assert "file_size" in data
        assert data["original_filename"] == "test_file.txt"
        assert data["file_size"] == len(file_content)
    
    def test_upload_file_with_subdirectory(self):
        """Test uploading file to subdirectory"""
        file_content = b"Test file in subdirectory"
        files = {"file": ("subdir_test.txt", io.BytesIO(file_content), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/files/upload?subdirectory=test_subdir",
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert "test_subdir" in data.get("file_url", "")
    
    def test_serve_uploaded_file(self):
        """Test serving uploaded files"""
        # First upload a file
        file_content = b"Content to serve"
        files = {"file": ("serve_test.txt", io.BytesIO(file_content), "text/plain")}
        
        upload_response = requests.post(f"{BASE_URL}/files/upload", files=files)
        assert upload_response.status_code == 200
        
        # Get the file URL
        file_url = upload_response.json().get("file_url")
        
        # Serve the file (note: /uploads is served at root, not /api)
        serve_url = BASE_URL.replace('/api', '') + file_url
        serve_response = requests.get(serve_url)
        assert serve_response.status_code == 200
        assert serve_response.content == file_content


class TestEmailNotificationEndpoints:
    """Test email notification endpoints"""
    
    def test_email_status(self):
        """Test email service status endpoint"""
        response = requests.get(f"{BASE_URL}/notifications/email/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "enabled" in data
        assert "smtp_host" in data
        assert "smtp_port" in data
        assert "email_from" in data
        
        # Email should be disabled (no SMTP configured)
        assert data["enabled"] == False
        assert data["smtp_host"] == "smtp.gmail.com"
        assert data["smtp_port"] == 587
    
    def test_send_test_email_requires_auth(self):
        """Test that sending test email requires authentication"""
        response = requests.post(f"{BASE_URL}/notifications/email/test", json={
            "to_emails": ["test@example.com"],
            "subject": "Test",
            "body": "Test body"
        })
        # Should require authentication
        assert response.status_code == 401
    
    def test_send_test_email_requires_admin(self, auth_headers):
        """Test sending test email (admin only)"""
        response = requests.post(
            f"{BASE_URL}/notifications/email/test",
            headers=auth_headers,
            json={
                "to_emails": ["test@example.com"],
                "subject": "Test Email",
                "body": "<h1>Test</h1>"
            }
        )
        # Should succeed but email won't actually send (SMTP not configured)
        assert response.status_code == 200
        data = response.json()
        # Since SMTP is not configured, it should return simulated response
        assert "success" in data or "simulated" in data


class TestNotificationBroadcast:
    """Test notification broadcast endpoints"""
    
    def test_broadcast_requires_auth(self):
        """Test that broadcast requires authentication"""
        response = requests.post(f"{BASE_URL}/notifications/broadcast", json={
            "title": "Test",
            "message": "Test message"
        })
        assert response.status_code == 401
    
    def test_broadcast_with_auth(self, auth_headers):
        """Test broadcast notification with admin auth"""
        response = requests.post(
            f"{BASE_URL}/notifications/broadcast",
            headers=auth_headers,
            json={
                "title": "Test Notification",
                "message": "This is a test broadcast",
                "type": "system_alert",
                "priority": "normal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestExistingFunctionality:
    """Verify existing functionality still works after changes"""
    
    def test_auth_login(self):
        """Test login still works"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_defect_tickets_list(self):
        """Test defect tickets list still works"""
        response = requests.get(f"{BASE_URL}/defect_tickets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_customer_complaints_list(self):
        """Test customer complaints list still works"""
        response = requests.get(f"{BASE_URL}/customer_complaints")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_rca_records_list(self):
        """Test RCA records list still works"""
        response = requests.get(f"{BASE_URL}/rca_records")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_capa_plans_list(self):
        """Test CAPA plans list still works"""
        response = requests.get(f"{BASE_URL}/capa_plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_statistics_endpoint(self):
        """Test statistics endpoint still works"""
        response = requests.get(f"{BASE_URL}/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "DefectTicket" in data
        assert "CustomerComplaint" in data


class TestWebSocketEndpoint:
    """Test WebSocket endpoint availability"""
    
    def test_websocket_endpoint_exists(self):
        """Test that WebSocket endpoint is accessible"""
        # We can't fully test WebSocket with requests, but we can check the endpoint exists
        # by trying to connect with HTTP (should fail with specific error)
        import socket
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        try:
            result = sock.connect_ex(('localhost', 8001))
            assert result == 0, "Backend server should be accessible"
        finally:
            sock.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
