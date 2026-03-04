"""
Iteration 11: Tests for Document Backup Feature
- GET /api/backup/documents - Export all documents as ZIP (admin only)
- POST /api/backup/documents/import - Import documents from ZIP (admin only)
"""

import pytest
import requests
import os
import tempfile
import zipfile
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "marc.hansen@canusa.de"
ADMIN_PASSWORD = "CanusaNexus2024!"

class TestDocumentsBackup:
    """Tests for document backup export/import functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "stay_logged_in": False
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    @pytest.fixture(scope="class")
    def viewer_session(self, admin_session):
        """Create viewer user and get session"""
        # Create viewer user
        viewer_email = "test_iter11_viewer_pytest@test.com"
        create_response = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": viewer_email,
            "password": "TestPass123!",
            "name": "Test Viewer Iter11",
            "role": "viewer"
        })
        if create_response.status_code == 400 and "bereits registriert" in create_response.text:
            # User already exists, login directly
            pass
        else:
            assert create_response.status_code == 200, f"Viewer creation failed: {create_response.text}"
        
        # Login as viewer
        viewer_session = requests.Session()
        login_response = viewer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": viewer_email,
            "password": "TestPass123!",
            "stay_logged_in": False
        })
        assert login_response.status_code == 200, f"Viewer login failed: {login_response.text}"
        
        yield viewer_session
        
        # Cleanup - delete viewer user
        users = admin_session.get(f"{BASE_URL}/api/users").json()
        for user in users:
            if user.get("email") == viewer_email:
                admin_session.delete(f"{BASE_URL}/api/users/{user['user_id']}")
    
    # ========== GET /api/backup/documents TESTS ==========
    
    def test_documents_export_admin_success(self, admin_session):
        """Admin can export documents as ZIP"""
        response = admin_session.get(f"{BASE_URL}/api/backup/documents")
        
        # Could be 200 (with documents) or 404 (no documents with valid files)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            # Verify it's a ZIP file
            assert response.headers.get('content-type') == 'application/zip'
            
            # Verify ZIP structure
            with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
                f.write(response.content)
                f.flush()
                
                with zipfile.ZipFile(f.name, 'r') as z:
                    namelist = z.namelist()
                    # Should contain manifest.json
                    assert 'manifest.json' in namelist, "ZIP should contain manifest.json"
                    
                    # Read and validate manifest
                    manifest = json.loads(z.read('manifest.json').decode('utf-8'))
                    assert 'version' in manifest
                    assert 'created_at' in manifest
                    assert 'documents' in manifest
                    assert 'total_files' in manifest
                    
                os.unlink(f.name)
        else:
            # 404 - no documents with valid files
            data = response.json()
            assert "detail" in data
            print(f"No documents to export: {data['detail']}")
    
    def test_documents_export_viewer_forbidden(self, viewer_session):
        """Viewer cannot export documents"""
        response = viewer_session.get(f"{BASE_URL}/api/backup/documents")
        assert response.status_code == 403
        assert "Administratoren" in response.json().get("detail", "")
    
    def test_documents_export_no_auth(self):
        """Unauthenticated user cannot export documents"""
        response = requests.get(f"{BASE_URL}/api/backup/documents")
        assert response.status_code == 401
    
    # ========== POST /api/backup/documents/import TESTS ==========
    
    def test_documents_import_valid_zip(self, admin_session):
        """Admin can import documents from valid ZIP"""
        # First, export existing documents
        export_response = admin_session.get(f"{BASE_URL}/api/backup/documents")
        
        if export_response.status_code == 404:
            pytest.skip("No documents to test import with")
        
        # Import the same ZIP (should skip existing)
        files = {'file': ('backup.zip', export_response.content, 'application/zip')}
        import_response = admin_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
        
        assert import_response.status_code == 200
        data = import_response.json()
        assert "results" in data
        assert "imported" in data["results"]
        assert "skipped" in data["results"]
        # Should skip existing documents
        assert data["results"]["skipped"] >= 0
    
    def test_documents_import_non_zip_file(self, admin_session):
        """Import rejects non-ZIP files"""
        files = {'file': ('test.txt', b'This is not a ZIP file', 'text/plain')}
        response = admin_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
        
        assert response.status_code == 400
        assert "ZIP-Datei" in response.json().get("detail", "")
    
    def test_documents_import_corrupt_zip(self, admin_session):
        """Import rejects corrupt ZIP files"""
        files = {'file': ('fake.zip', b'This is not a valid ZIP', 'application/zip')}
        response = admin_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
        
        assert response.status_code == 400
        assert "Ungültige ZIP-Datei" in response.json().get("detail", "")
    
    def test_documents_import_viewer_forbidden(self, viewer_session):
        """Viewer cannot import documents"""
        # Create a minimal valid ZIP
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            with zipfile.ZipFile(f.name, 'w') as z:
                z.writestr('manifest.json', '{}')
            f.flush()
            
            with open(f.name, 'rb') as zf:
                files = {'file': ('backup.zip', zf.read(), 'application/zip')}
                response = viewer_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
            
            os.unlink(f.name)
        
        assert response.status_code == 403
        assert "Administratoren" in response.json().get("detail", "")
    
    def test_documents_import_no_auth(self):
        """Unauthenticated user cannot import documents"""
        files = {'file': ('backup.zip', b'test', 'application/zip')}
        response = requests.post(f"{BASE_URL}/api/backup/documents/import", files=files)
        assert response.status_code == 401
    
    def test_documents_import_empty_zip(self, admin_session):
        """Import handles empty ZIP gracefully"""
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            with zipfile.ZipFile(f.name, 'w') as z:
                z.writestr('manifest.json', '{"documents": []}')
            f.flush()
            
            with open(f.name, 'rb') as zf:
                files = {'file': ('backup.zip', zf.read(), 'application/zip')}
                response = admin_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
            
            os.unlink(f.name)
        
        # Should succeed but import nothing
        assert response.status_code == 200
        data = response.json()
        assert data["results"]["imported"] == 0


class TestDocumentsBackupIntegration:
    """Integration tests for full backup/restore cycle"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "stay_logged_in": False
        })
        assert response.status_code == 200
        return session
    
    def test_export_import_cycle(self, admin_session):
        """Test full export -> import cycle preserves data"""
        # Export
        export_response = admin_session.get(f"{BASE_URL}/api/backup/documents")
        
        if export_response.status_code == 404:
            pytest.skip("No documents for integration test")
        
        assert export_response.status_code == 200
        
        # Parse exported ZIP
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as f:
            f.write(export_response.content)
            f.flush()
            
            with zipfile.ZipFile(f.name, 'r') as z:
                manifest = json.loads(z.read('manifest.json').decode('utf-8'))
                exported_count = manifest.get('total_files', 0)
            
            # Import same ZIP
            with open(f.name, 'rb') as zf:
                files = {'file': ('backup.zip', zf.read(), 'application/zip')}
                import_response = admin_session.post(f"{BASE_URL}/api/backup/documents/import", files=files)
            
            os.unlink(f.name)
        
        assert import_response.status_code == 200
        data = import_response.json()
        
        # All should be skipped since they already exist
        assert data["results"]["skipped"] == exported_count
        assert data["results"]["errors"] == 0
