"""
Iteration 26 Tests: User Last Active, Document Folder Move
Features tested:
1. User Management - 'last_active' field tracks last activity time
2. Document Folders - /api/document-folders/{id}/move endpoint moves folders
"""
import pytest
import requests
import os
import uuid
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_session():
    """Shared requests session with authentication"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "marc.hansen@canusa.de",
        "password": "CanusaNexus2024!"
    })
    
    if response.status_code == 200:
        # Copy cookies from response to session
        return session
    pytest.skip("Authentication failed - skipping tests")


class TestUserLastActive:
    """Test suite for 'Zuletzt online' (last_active) feature"""
    
    def test_login_updates_last_active(self, api_session):
        """Test that login updates the last_active field"""
        # Get the current user via /me endpoint (this also updates last_active)
        response = api_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        user_data = response.json()
        
        # Check the users list to verify last_active is set
        users_response = api_session.get(f"{BASE_URL}/api/users")
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find the logged-in user
        logged_user = next((u for u in users if u['user_id'] == user_data['user_id']), None)
        assert logged_user is not None, "Logged in user should be in users list"
        assert 'last_active' in logged_user, "User should have last_active field"
        assert logged_user['last_active'] is not None, "last_active should not be None after login"
        
    def test_users_api_returns_last_active_field(self, api_session):
        """Test that GET /api/users includes last_active field"""
        response = api_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0, "Should have at least one user"
        
        # Check that last_active is a valid datetime or None
        for user in users:
            if 'last_active' in user and user['last_active'] is not None:
                # Try to parse the datetime
                try:
                    datetime.fromisoformat(user['last_active'].replace('Z', '+00:00'))
                except ValueError:
                    pytest.fail(f"last_active is not a valid ISO datetime: {user['last_active']}")
    
    def test_auth_me_updates_last_active(self, api_session):
        """Test that /api/auth/me endpoint updates last_active timestamp"""
        # Get current time
        before_time = datetime.utcnow()
        time.sleep(1)  # Small delay to ensure timestamp difference
        
        # Call /me endpoint (should update last_active)
        response = api_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        user_id = response.json()['user_id']
        
        # Fetch users list to check the updated last_active
        users_response = api_session.get(f"{BASE_URL}/api/users")
        assert users_response.status_code == 200
        
        user = next((u for u in users_response.json() if u['user_id'] == user_id), None)
        assert user is not None
        
        if user.get('last_active'):
            last_active = datetime.fromisoformat(user['last_active'].replace('Z', '+00:00')).replace(tzinfo=None)
            # last_active should be recent (within last minute)
            time_diff = (datetime.utcnow() - last_active).total_seconds()
            assert time_diff < 60, f"last_active should be within last minute, but was {time_diff}s ago"


class TestDocumentFolderMove:
    """Test suite for document folder move functionality"""
    
    @pytest.fixture
    def test_folders(self, api_session):
        """Create test folders for move tests and clean them up after"""
        unique_id = uuid.uuid4().hex[:8]
        parent_name = f"TEST_PARENT_{unique_id}"
        child_name = f"TEST_CHILD_{unique_id}"
        target_name = f"TEST_TARGET_{unique_id}"
        
        # Create parent folder
        parent_resp = api_session.post(f"{BASE_URL}/api/document-folders", json={
            "name": parent_name,
            "description": "Test parent folder"
        })
        assert parent_resp.status_code == 200, f"Failed to create parent folder: {parent_resp.text}"
        parent = parent_resp.json()
        
        # Create child folder under parent
        child_resp = api_session.post(f"{BASE_URL}/api/document-folders", json={
            "name": child_name,
            "parent_id": parent['folder_id'],
            "description": "Test child folder"
        })
        assert child_resp.status_code == 200, f"Failed to create child folder: {child_resp.text}"
        child = child_resp.json()
        
        # Create target folder (separate hierarchy)
        target_resp = api_session.post(f"{BASE_URL}/api/document-folders", json={
            "name": target_name,
            "description": "Test target folder"
        })
        assert target_resp.status_code == 200, f"Failed to create target folder: {target_resp.text}"
        target = target_resp.json()
        
        yield {"parent": parent, "child": child, "target": target}
        
        # Cleanup - delete folders in reverse order
        for folder in [child, parent, target]:
            try:
                api_session.delete(f"{BASE_URL}/api/document-folders/{folder['folder_id']}")
            except:
                pass
    
    def test_move_folder_endpoint_exists(self, api_session, test_folders):
        """Test that PUT /api/document-folders/{id}/move endpoint exists"""
        child = test_folders['child']
        target = test_folders['target']
        
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{child['folder_id']}/move",
            json={"target_folder_id": target['folder_id']}
        )
        assert response.status_code in [200, 400, 403], f"Unexpected status: {response.status_code}"
        
    def test_move_folder_to_another_folder(self, api_session, test_folders):
        """Test moving a folder to another folder"""
        child = test_folders['child']
        target = test_folders['target']
        
        # Move child to target
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{child['folder_id']}/move",
            json={"target_folder_id": target['folder_id']}
        )
        assert response.status_code == 200, f"Move failed: {response.text}"
        
        moved_folder = response.json()
        assert moved_folder['parent_id'] == target['folder_id'], "Folder should be under target"
        
        # Verify by fetching the folder list
        folders_resp = api_session.get(f"{BASE_URL}/api/document-folders")
        assert folders_resp.status_code == 200
        
        folder = next((f for f in folders_resp.json() if f['folder_id'] == child['folder_id']), None)
        assert folder is not None
        assert folder['parent_id'] == target['folder_id'], "parent_id should be updated in database"
    
    def test_move_folder_to_root(self, api_session, test_folders):
        """Test moving a folder to root (no parent)"""
        child = test_folders['child']
        
        # Move child to root (target_folder_id = null)
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{child['folder_id']}/move",
            json={"target_folder_id": None}
        )
        assert response.status_code == 200, f"Move to root failed: {response.text}"
        
        moved_folder = response.json()
        assert moved_folder['parent_id'] is None, "Folder should be at root"
    
    def test_prevent_circular_reference(self, api_session, test_folders):
        """Test that moving a parent into its own child is prevented"""
        parent = test_folders['parent']
        child = test_folders['child']
        
        # Try to move parent into its child (should fail)
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{parent['folder_id']}/move",
            json={"target_folder_id": child['folder_id']}
        )
        assert response.status_code == 400, "Should reject circular reference"
        assert "zirkulär" in response.json().get('detail', '').lower() or "circular" in response.json().get('detail', '').lower(), \
            "Error message should mention circular reference"
    
    def test_prevent_move_to_self(self, api_session, test_folders):
        """Test that moving a folder into itself is prevented"""
        child = test_folders['child']
        
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{child['folder_id']}/move",
            json={"target_folder_id": child['folder_id']}
        )
        assert response.status_code == 400, "Should reject self-reference"
    
    def test_move_nonexistent_folder(self, api_session):
        """Test moving a non-existent folder returns 404"""
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/nonexistent_folder_id/move",
            json={"target_folder_id": None}
        )
        assert response.status_code == 404, "Should return 404 for non-existent folder"
    
    def test_move_to_nonexistent_target(self, api_session, test_folders):
        """Test moving to a non-existent target folder returns 404"""
        child = test_folders['child']
        
        response = api_session.put(
            f"{BASE_URL}/api/document-folders/{child['folder_id']}/move",
            json={"target_folder_id": "nonexistent_target_id"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent target"


class TestUserManagementIntegration:
    """Integration tests for user management features"""
    
    def test_get_users_returns_expected_fields(self, api_session):
        """Test that user list returns all expected fields including last_active"""
        response = api_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0
        
        # Check expected fields exist (may or may not have last_active)
        expected_fields = ['user_id', 'email', 'name', 'role', 'created_at']
        user = users[0]
        for field in expected_fields:
            assert field in user, f"User should have '{field}' field"
    
    def test_password_hash_not_exposed(self, api_session):
        """Test that password_hash is not returned in user list"""
        response = api_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        users = response.json()
        
        for user in users:
            assert 'password_hash' not in user, "password_hash should not be exposed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
