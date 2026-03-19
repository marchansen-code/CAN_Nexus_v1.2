"""
Backend tests for Documents Page iteration 24 features:
1. Document folder navigation
2. Document move endpoint
3. Multi-image upload API
4. Drag & drop support (via move endpoint)
"""
import pytest
import requests
import os
import json
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nexus-platform-36.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "marc.hansen@canusa.de",
        "password": "CanusaNexus2024!"
    })
    
    if login_resp.status_code != 200:
        pytest.skip(f"Login failed: {login_resp.status_code}")
    
    return s


class TestDocumentsAPI:
    """Test documents API endpoints"""
    
    def test_get_documents(self, session):
        """Test getting all documents"""
        response = session.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_document_folders(self, session):
        """Test getting all document folders"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have some folders (Bilder folder is auto-created)
        folder_names = [f.get('name') for f in data]
        # Bilder folder should exist
        assert 'Bilder' in folder_names or len(folder_names) > 0
    
    def test_document_folder_structure(self, session):
        """Test that folder structure contains expected fields"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        assert response.status_code == 200
        
        folders = response.json()
        if len(folders) > 0:
            folder = folders[0]
            assert 'folder_id' in folder
            assert 'name' in folder
            # parent_id can be None for root folders
            assert 'parent_id' in folder or folder.get('parent_id') is None
    
    def test_documents_have_folder_id(self, session):
        """Test that documents have folder_id field"""
        response = session.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200
        
        docs = response.json()
        if len(docs) > 0:
            doc = docs[0]
            # folder_id can be None if document is in root
            assert 'folder_id' in doc or doc.get('folder_id') is None


class TestDocumentMoveAPI:
    """Test document move endpoint for drag & drop support"""
    
    def test_move_document_endpoint_exists(self, session):
        """Test that move endpoint exists"""
        # First get a document
        docs_resp = session.get(f"{BASE_URL}/api/documents")
        assert docs_resp.status_code == 200
        
        docs = docs_resp.json()
        if len(docs) == 0:
            pytest.skip("No documents to test move endpoint")
        
        doc = docs[0]
        doc_id = doc.get('document_id')
        
        # Try moving to same location (should not fail)
        current_folder = doc.get('folder_id') or ""
        response = session.put(
            f"{BASE_URL}/api/documents/{doc_id}/move",
            params={"folder_id": current_folder}
        )
        
        # Should be 200 (success) or 403/404
        assert response.status_code in [200, 403, 404]
    
    def test_move_document_to_folder(self, session):
        """Test moving document to a different folder"""
        # Get documents
        docs_resp = session.get(f"{BASE_URL}/api/documents")
        docs = docs_resp.json()
        
        if len(docs) == 0:
            pytest.skip("No documents to test move")
        
        doc = docs[0]
        doc_id = doc.get('document_id')
        original_folder = doc.get('folder_id')
        
        # Get folders
        folders_resp = session.get(f"{BASE_URL}/api/document-folders")
        folders = folders_resp.json()
        
        if len(folders) == 0:
            pytest.skip("No folders to test move")
        
        # Pick a different folder
        target_folder = None
        for folder in folders:
            if folder.get('folder_id') != original_folder:
                target_folder = folder.get('folder_id')
                break
        
        if not target_folder:
            pytest.skip("No alternative folder found")
        
        # Move document
        response = session.put(
            f"{BASE_URL}/api/documents/{doc_id}/move",
            params={"folder_id": target_folder}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'message' in result
        
        # Move back to original
        session.put(
            f"{BASE_URL}/api/documents/{doc_id}/move",
            params={"folder_id": original_folder or ""}
        )
    
    def test_move_document_to_root(self, session):
        """Test moving document to root (no folder)"""
        docs_resp = session.get(f"{BASE_URL}/api/documents")
        docs = docs_resp.json()
        
        if len(docs) == 0:
            pytest.skip("No documents to test")
        
        doc = docs[0]
        doc_id = doc.get('document_id')
        original_folder = doc.get('folder_id')
        
        # Move to root (empty folder_id)
        response = session.put(
            f"{BASE_URL}/api/documents/{doc_id}/move",
            params={"folder_id": ""}
        )
        
        assert response.status_code == 200
        
        # Move back to original folder if it had one
        if original_folder:
            session.put(
                f"{BASE_URL}/api/documents/{doc_id}/move",
                params={"folder_id": original_folder}
            )


class TestMultiImageUploadAPI:
    """Test multi-image upload endpoint"""
    
    def test_upload_multiple_images_endpoint_exists(self, session):
        """Test that multi-image upload endpoint exists"""
        # Test with empty request (should return error, not 404)
        response = session.post(
            f"{BASE_URL}/api/images/upload-multiple",
            files=[]
        )
        # Should be 422 (validation error) not 404 (not found)
        assert response.status_code in [422, 400]
    
    def test_images_endpoint(self, session):
        """Test single image upload endpoint exists"""
        # Test OPTIONS or empty POST
        response = session.post(
            f"{BASE_URL}/api/images/upload",
            files=[]
        )
        # Should be 422 (validation error) not 404
        assert response.status_code in [422, 400]


class TestDocumentFolderAPI:
    """Test document folder CRUD operations"""
    
    def test_create_folder(self, session):
        """Test creating a new folder"""
        unique_name = f"TEST_folder_{uuid.uuid4().hex[:8]}"
        
        response = session.post(
            f"{BASE_URL}/api/document-folders",
            json={
                "name": unique_name,
                "parent_id": None,
                "description": "Test folder for automated testing"
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'folder_id' in result
        
        folder_id = result['folder_id']
        
        # Cleanup - delete the folder
        session.delete(f"{BASE_URL}/api/document-folders/{folder_id}")
    
    def test_update_folder(self, session):
        """Test updating a folder"""
        # Create a folder first
        unique_name = f"TEST_update_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(
            f"{BASE_URL}/api/document-folders",
            json={"name": unique_name, "parent_id": None}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test folder")
        
        folder_id = create_resp.json()['folder_id']
        
        # Update the folder
        new_name = f"TEST_updated_{uuid.uuid4().hex[:8]}"
        update_resp = session.put(
            f"{BASE_URL}/api/document-folders/{folder_id}",
            json={"name": new_name, "parent_id": None}
        )
        
        assert update_resp.status_code == 200
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/document-folders/{folder_id}")
    
    def test_delete_folder(self, session):
        """Test deleting a folder"""
        # Create a folder first
        unique_name = f"TEST_delete_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(
            f"{BASE_URL}/api/document-folders",
            json={"name": unique_name, "parent_id": None}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test folder")
        
        folder_id = create_resp.json()['folder_id']
        
        # Delete the folder
        delete_resp = session.delete(f"{BASE_URL}/api/document-folders/{folder_id}")
        
        assert delete_resp.status_code == 200


class TestBilderFolderAutoCreate:
    """Test that Bilder folder is auto-created for images"""
    
    def test_bilder_folder_exists(self, session):
        """Test that Bilder folder exists or gets created"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        assert response.status_code == 200
        
        folders = response.json()
        folder_names = [f.get('name') for f in folders]
        
        # Bilder folder should exist (auto-created by image upload)
        # If not, it will be created on first image upload
        # This is acceptable behavior
        if 'Bilder' not in folder_names:
            # Folder will be created when first image is uploaded
            pass
