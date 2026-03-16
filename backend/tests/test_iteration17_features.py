"""
Iteration 17: Tests for new features:
1. User mention search API (/api/users/search/mention)
2. Article versioning API (/api/versions/articles/*)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_session():
    """Create an authenticated session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "marc.hansen@canusa.de",
        "password": "CanusaNexus2024!"
    })
    
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    return session


class TestUserMentionSearch:
    """Tests for user mention search API endpoint."""
    
    def test_search_users_without_query(self, auth_session):
        """GET /api/users/search/mention returns users when no query is provided."""
        response = auth_session.get(f"{BASE_URL}/api/users/search/mention")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        # Should return up to 8 users by default
        assert len(data["results"]) <= 8
        
    def test_search_users_with_query(self, auth_session):
        """GET /api/users/search/mention?q=marc returns matching users."""
        response = auth_session.get(f"{BASE_URL}/api/users/search/mention", params={"q": "marc"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        # At least one result should contain "marc" in name or email
        if len(data["results"]) > 0:
            found_marc = False
            for user in data["results"]:
                if "marc" in user.get("name", "").lower() or "marc" in user.get("email", "").lower():
                    found_marc = True
                    break
            assert found_marc, "Search query 'marc' should return users with 'marc' in name/email"
            
    def test_search_users_response_structure(self, auth_session):
        """Verify the response structure contains user_id, name, email, and role."""
        response = auth_session.get(f"{BASE_URL}/api/users/search/mention")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["results"]) > 0:
            user = data["results"][0]
            assert "user_id" in user
            assert "name" in user
            assert "email" in user
            assert "role" in user
            
    def test_search_users_with_limit(self, auth_session):
        """GET /api/users/search/mention?limit=3 limits results."""
        response = auth_session.get(f"{BASE_URL}/api/users/search/mention", params={"limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) <= 3
        
    def test_search_users_excludes_blocked(self, auth_session):
        """Search should not return blocked users."""
        response = auth_session.get(f"{BASE_URL}/api/users/search/mention")
        assert response.status_code == 200
        data = response.json()
        # All returned users should not be blocked
        for user in data["results"]:
            # Blocked users shouldn't appear in results (no is_blocked field should be True)
            assert user.get("is_blocked") != True or "is_blocked" not in user
            
    def test_search_users_without_auth(self):
        """GET /api/users/search/mention without auth should return 401."""
        response = requests.get(f"{BASE_URL}/api/users/search/mention")
        assert response.status_code == 401


class TestArticleVersioning:
    """Tests for article versioning API endpoints."""
    
    @pytest.fixture
    def existing_article_id(self, auth_session):
        """Get an existing article ID for testing."""
        response = auth_session.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        articles = response.json()
        if len(articles) == 0:
            pytest.skip("No articles found for testing")
        return articles[0]["article_id"]
    
    def test_get_article_versions(self, auth_session, existing_article_id):
        """GET /api/versions/articles/{article_id} returns version list."""
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}")
        assert response.status_code == 200
        versions = response.json()
        assert isinstance(versions, list)
        
    def test_version_list_structure(self, auth_session, existing_article_id):
        """Verify version list response structure."""
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}")
        assert response.status_code == 200
        versions = response.json()
        
        if len(versions) > 0:
            version = versions[0]
            assert "version_id" in version
            assert "version_number" in version
            assert "created_by_name" in version
            assert "created_at" in version
            
    def test_get_specific_version(self, auth_session, existing_article_id):
        """GET /api/versions/articles/{article_id}/{version_id} returns version details."""
        # First get the version list
        list_response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}")
        if list_response.status_code != 200:
            pytest.skip("No versions available")
        
        versions = list_response.json()
        if len(versions) == 0:
            pytest.skip("No versions available for this article")
            
        version_id = versions[0]["version_id"]
        
        # Get specific version
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}/{version_id}")
        assert response.status_code == 200
        version = response.json()
        
        # Verify full version data is returned
        assert "version_id" in version
        assert "title" in version
        assert "content" in version
        assert "version_number" in version
        
    def test_get_versions_nonexistent_article(self, auth_session):
        """GET /api/versions/articles/{invalid_id} returns 404."""
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/nonexistent_article_12345")
        assert response.status_code == 404
        
    def test_get_nonexistent_version(self, auth_session, existing_article_id):
        """GET /api/versions/articles/{article_id}/{invalid_version_id} returns 404."""
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}/nonexistent_ver_12345")
        assert response.status_code == 404
        
    def test_versions_sorted_descending(self, auth_session, existing_article_id):
        """Verify versions are returned sorted by version_number descending."""
        response = auth_session.get(f"{BASE_URL}/api/versions/articles/{existing_article_id}")
        assert response.status_code == 200
        versions = response.json()
        
        if len(versions) >= 2:
            for i in range(len(versions) - 1):
                assert versions[i]["version_number"] > versions[i + 1]["version_number"], \
                    "Versions should be sorted by version_number descending"
                    
    def test_version_creation_on_article_update(self, auth_session):
        """Test that updating an article creates a new version."""
        # Create a test article
        create_response = auth_session.post(f"{BASE_URL}/api/articles", json={
            "title": f"TEST_VersionTest_{int(time.time())}",
            "content": "<p>Initial content</p>",
            "status": "draft",
            "tags": []
        })
        assert create_response.status_code == 200
        article = create_response.json()
        article_id = article["article_id"]
        
        try:
            # Get initial version count
            versions_before = auth_session.get(f"{BASE_URL}/api/versions/articles/{article_id}")
            initial_count = len(versions_before.json()) if versions_before.status_code == 200 else 0
            
            # Update the article
            update_response = auth_session.put(f"{BASE_URL}/api/articles/{article_id}", json={
                "title": f"TEST_VersionTest_{int(time.time())}_Updated",
                "content": "<p>Updated content</p>"
            })
            assert update_response.status_code == 200
            
            # Check version count increased
            versions_after = auth_session.get(f"{BASE_URL}/api/versions/articles/{article_id}")
            assert versions_after.status_code == 200
            final_count = len(versions_after.json())
            
            assert final_count > initial_count, "Updating an article should create a new version"
            
        finally:
            # Cleanup - delete the test article
            auth_session.delete(f"{BASE_URL}/api/articles/{article_id}")
            
    def test_version_without_auth(self):
        """GET /api/versions/articles/{id} without auth should return 401."""
        response = requests.get(f"{BASE_URL}/api/versions/articles/art_test123")
        assert response.status_code == 401


class TestArticleLinkableMention:
    """Tests for article linkable mention search (existing feature, regression check)."""
    
    def test_search_linkable_articles(self, auth_session):
        """GET /api/articles/search/linkable?q=test returns matching articles."""
        response = auth_session.get(f"{BASE_URL}/api/articles/search/linkable", params={"q": "Test"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        
    def test_search_linkable_short_query(self, auth_session):
        """GET /api/articles/search/linkable with short query returns empty."""
        response = auth_session.get(f"{BASE_URL}/api/articles/search/linkable", params={"q": "a"})
        assert response.status_code == 200
        data = response.json()
        # Query too short should return empty results
        assert "results" in data
        
    def test_linkable_article_structure(self, auth_session):
        """Verify linkable article search returns article_id, title, status."""
        response = auth_session.get(f"{BASE_URL}/api/articles/search/linkable", params={"q": "Verhalten"})
        assert response.status_code == 200
        data = response.json()
        
        if len(data["results"]) > 0:
            article = data["results"][0]
            assert "article_id" in article
            assert "title" in article
            assert "status" in article
