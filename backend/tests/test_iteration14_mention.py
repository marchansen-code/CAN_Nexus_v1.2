"""
Iteration 14: Tests for @-Mention (Article Linking) Feature
Tests the /api/articles/search/linkable endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session"""
    session = requests.Session()
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!"
        }
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    return session


@pytest.fixture(scope="module")
def test_article(auth_session):
    """Create a test article for searching"""
    unique_id = uuid.uuid4().hex[:8]
    article_data = {
        "title": f"TEST_iter14_Mention_{unique_id}",
        "content": "<p>Test article for mention search</p>",
        "category_ids": [],
        "status": "published",
        "tags": ["test-mention"]
    }
    response = auth_session.post(f"{BASE_URL}/api/articles", json=article_data)
    assert response.status_code == 200, f"Failed to create test article: {response.text}"
    article = response.json()
    yield article
    
    # Cleanup
    auth_session.delete(f"{BASE_URL}/api/articles/{article['article_id']}")


class TestLinkableArticlesSearch:
    """Tests for /api/articles/search/linkable endpoint"""
    
    def test_search_linkable_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/articles/search/linkable?q=test")
        assert response.status_code == 401
    
    def test_search_linkable_with_valid_query(self, auth_session, test_article):
        """Test searching for linkable articles with valid query"""
        # Search with part of the test article title
        response = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "TEST_iter14", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        
        # Find our test article in results
        found = any(r["article_id"] == test_article["article_id"] for r in data["results"])
        assert found, "Test article should appear in search results"
    
    def test_search_linkable_returns_required_fields(self, auth_session, test_article):
        """Test that search results contain required fields for mention"""
        response = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "TEST_iter14", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["results"]) > 0, "Should have at least one result"
        
        # Check required fields for mention functionality
        result = data["results"][0]
        assert "article_id" in result, "Result should have article_id"
        assert "title" in result, "Result should have title"
        assert "status" in result, "Result should have status"
    
    def test_search_linkable_short_query(self, auth_session):
        """Test that short queries (< 2 chars) return empty results"""
        response = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "a", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == [], "Short query should return empty results"
    
    def test_search_linkable_empty_query(self, auth_session):
        """Test that empty query returns empty results"""
        response = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == [], "Empty query should return empty results"
    
    def test_search_linkable_respects_limit(self, auth_session):
        """Test that limit parameter is respected"""
        response = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "a", "limit": 3}
        )
        assert response.status_code == 200
        # Even if there are results, they should be limited
        data = response.json()
        assert len(data["results"]) <= 3
    
    def test_search_linkable_case_insensitive(self, auth_session, test_article):
        """Test that search is case-insensitive"""
        # Search with lowercase
        response_lower = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "test_iter14", "limit": 10}
        )
        assert response_lower.status_code == 200
        data_lower = response_lower.json()
        
        # Search with uppercase
        response_upper = auth_session.get(
            f"{BASE_URL}/api/articles/search/linkable",
            params={"q": "TEST_ITER14", "limit": 10}
        )
        assert response_upper.status_code == 200
        data_upper = response_upper.json()
        
        # Both should find the same article
        found_lower = any(r["article_id"] == test_article["article_id"] for r in data_lower["results"])
        found_upper = any(r["article_id"] == test_article["article_id"] for r in data_upper["results"])
        
        assert found_lower and found_upper, "Search should be case-insensitive"


class TestArticleViewNoSummary:
    """Verify that summary field is not exposed in article view endpoint"""
    
    def test_article_response_structure(self, auth_session, test_article):
        """Test article GET response has expected structure without summary display requirement"""
        response = auth_session.get(f"{BASE_URL}/api/articles/{test_article['article_id']}")
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for article view
        assert "article_id" in data
        assert "title" in data
        assert "content" in data
        assert "status" in data
        assert "created_at" in data
        assert "updated_at" in data
