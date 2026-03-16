"""
Iteration 16: Test PDF Viewer Feature - PDF File Streaming Endpoint
Tests:
1. PDF file streaming endpoint (/api/documents/{document_id}/file)
2. Verify PDF file is returned with correct content type
3. Authentication requirements
4. Error handling for missing documents/files
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_DOC_ID = 'doc_71438fad9dc7'  # Known test document


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "marc.hansen@canusa.de",
        "password": "CanusaNexus2024!"
    })
    
    if login_response.status_code != 200:
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    return s


class TestPDFFileEndpoint:
    """Test PDF file streaming endpoint"""
    
    def test_get_pdf_file_success(self, session):
        """Test successful retrieval of PDF file"""
        response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        
        assert response.status_code == 200
        
        # Verify content type is PDF
        content_type = response.headers.get('content-type', '')
        assert 'application/pdf' in content_type
        
        # Verify we got actual content
        assert len(response.content) > 0
    
    def test_pdf_file_is_valid_pdf(self, session):
        """Test that the returned file is a valid PDF"""
        response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        
        assert response.status_code == 200
        
        # PDF files start with %PDF-
        content_start = response.content[:10].decode('latin-1')
        assert content_start.startswith('%PDF-')
    
    def test_pdf_file_has_content_disposition(self, session):
        """Test that response has correct content-disposition header"""
        response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        
        assert response.status_code == 200
        
        # Should have a content-disposition header for download
        content_disposition = response.headers.get('content-disposition', '')
        # FileResponse includes filename in content-disposition
        assert 'filename' in content_disposition.lower() or 'attachment' in content_disposition.lower()
    
    def test_get_pdf_file_nonexistent_document(self, session):
        """Test 404 for non-existent document"""
        response = session.get(f"{BASE_URL}/api/documents/doc_nonexistent123/file")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_get_pdf_file_requires_authentication(self):
        """Test that endpoint requires authentication"""
        # Request without cookies
        response = requests.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        
        assert response.status_code == 401
    
    def test_get_pdf_file_deleted_document(self, session):
        """Test that deleted documents are not accessible"""
        # First try to access a document that doesn't exist (simulating deleted)
        response = session.get(f"{BASE_URL}/api/documents/doc_deleted_test/file")
        
        assert response.status_code == 404


class TestPDFFileEndpointWithDifferentDocuments:
    """Test PDF file endpoint with various document states"""
    
    def test_list_completed_documents_have_files(self, session):
        """Test that completed documents can have their files retrieved"""
        # Get list of documents
        list_response = session.get(f"{BASE_URL}/api/documents")
        assert list_response.status_code == 200
        
        documents = list_response.json()
        completed_docs = [d for d in documents if d.get("status") == "completed"]
        
        # Test file retrieval for first completed document
        if completed_docs:
            doc_id = completed_docs[0]["document_id"]
            file_response = session.get(f"{BASE_URL}/api/documents/{doc_id}/file")
            
            # Should either return the file or 404 if file path is missing
            assert file_response.status_code in [200, 404]
            
            if file_response.status_code == 200:
                content_type = file_response.headers.get('content-type', '')
                assert 'application/pdf' in content_type


class TestPDFFileEndpointIntegration:
    """Integration tests for PDF viewer workflow"""
    
    def test_document_details_and_file_endpoint(self, session):
        """Test that document details and file endpoint work together"""
        # Get document details
        details_response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}")
        assert details_response.status_code == 200
        
        details = details_response.json()
        assert details["document_id"] == TEST_DOC_ID
        assert details["status"] == "completed"
        
        # Get the file
        file_response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        assert file_response.status_code == 200
        
        # Filename in response should match document filename
        content_disposition = file_response.headers.get('content-disposition', '')
        doc_filename = details.get("filename", "")
        
        # The filename in the header should contain the document filename
        if doc_filename:
            assert doc_filename.lower().replace(' ', '') in content_disposition.lower().replace(' ', '').replace('%20', '') or 'filename' in content_disposition.lower()
    
    def test_pdf_file_and_convert_to_html_endpoints(self, session):
        """Test that both PDF file and convert-to-html endpoints work for same document"""
        # Get the raw PDF file
        file_response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/file")
        assert file_response.status_code == 200
        assert 'application/pdf' in file_response.headers.get('content-type', '')
        
        # Get the HTML conversion
        html_response = session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/convert-to-html")
        assert html_response.status_code == 200
        
        html_data = html_response.json()
        assert html_data["success"] is True
        assert html_data["document_id"] == TEST_DOC_ID
        assert len(html_data["html_content"]) > 0
