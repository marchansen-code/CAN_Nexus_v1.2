"""
Iteration 25: Article Move Feature and Image Upload Dialog Folder Tree Testing

Tests for:
1. Articles page - Move option in dropdown menu (uses PUT /api/articles/{id})
2. Articles page - Move functionality (update category_ids via API)
3. Image upload dialog - Folder API tests for hierarchical folder structure
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    return s


@pytest.fixture(scope="module")
def categories(session):
    """Get all categories"""
    response = session.get(f"{BASE_URL}/api/categories")
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def test_article(session, categories):
    """Create a test article for move testing"""
    unique_id = str(uuid.uuid4())[:8]
    article_data = {
        "title": f"TEST_MoveArticle_{unique_id}",
        "content": "<p>Test article for move feature testing</p>",
        "category_ids": [],
        "status": "draft",
        "tags": ["test", "move-feature"]
    }
    
    response = session.post(f"{BASE_URL}/api/articles", json=article_data)
    assert response.status_code == 200, f"Failed to create test article: {response.text}"
    article = response.json()
    
    yield article
    
    # Cleanup: delete the test article
    session.delete(f"{BASE_URL}/api/articles/{article['article_id']}")


@pytest.fixture(scope="module")
def test_categories(session):
    """Create test categories for hierarchical move testing"""
    unique_id = str(uuid.uuid4())[:8]
    
    # Create parent category
    parent_data = {
        "name": f"TEST_ParentCat_{unique_id}",
        "description": "Test parent category for move testing",
        "parent_id": None
    }
    parent_response = session.post(f"{BASE_URL}/api/categories", json=parent_data)
    assert parent_response.status_code == 200, f"Failed to create parent category: {parent_response.text}"
    parent_cat = parent_response.json()
    
    # Create child category
    child_data = {
        "name": f"TEST_ChildCat_{unique_id}",
        "description": "Test child category for move testing",
        "parent_id": parent_cat["category_id"]
    }
    child_response = session.post(f"{BASE_URL}/api/categories", json=child_data)
    assert child_response.status_code == 200, f"Failed to create child category: {child_response.text}"
    child_cat = child_response.json()
    
    yield {"parent": parent_cat, "child": child_cat}
    
    # Cleanup: delete test categories (child first, then parent)
    session.delete(f"{BASE_URL}/api/categories/{child_cat['category_id']}")
    session.delete(f"{BASE_URL}/api/categories/{parent_cat['category_id']}")


class TestArticleMoveAPI:
    """Test article move functionality via API"""
    
    def test_move_article_to_category(self, session, test_article, test_categories):
        """Test moving an article to a category"""
        article_id = test_article["article_id"]
        target_category_id = test_categories["parent"]["category_id"]
        
        # Move article to category by updating category_ids
        response = session.put(f"{BASE_URL}/api/articles/{article_id}", json={
            "category_ids": [target_category_id]
        })
        
        assert response.status_code == 200, f"Move failed: {response.text}"
        updated_article = response.json()
        
        # Verify the article was moved
        assert target_category_id in updated_article.get("category_ids", []), \
            f"Article not in target category. category_ids: {updated_article.get('category_ids')}"
    
    def test_move_article_to_child_category(self, session, test_article, test_categories):
        """Test moving an article to a child category"""
        article_id = test_article["article_id"]
        child_category_id = test_categories["child"]["category_id"]
        
        # Move article to child category
        response = session.put(f"{BASE_URL}/api/articles/{article_id}", json={
            "category_ids": [child_category_id]
        })
        
        assert response.status_code == 200, f"Move to child failed: {response.text}"
        updated_article = response.json()
        
        # Verify the article was moved to child category
        assert child_category_id in updated_article.get("category_ids", []), \
            f"Article not in child category. category_ids: {updated_article.get('category_ids')}"
    
    def test_move_article_to_root(self, session, test_article):
        """Test moving an article to root (no category)"""
        article_id = test_article["article_id"]
        
        # Move article to root by setting empty category_ids
        response = session.put(f"{BASE_URL}/api/articles/{article_id}", json={
            "category_ids": []
        })
        
        assert response.status_code == 200, f"Move to root failed: {response.text}"
        updated_article = response.json()
        
        # Verify the article has no categories
        assert updated_article.get("category_ids", []) == [], \
            f"Article still has categories: {updated_article.get('category_ids')}"
    
    def test_get_article_after_move(self, session, test_article, test_categories):
        """Test that GET returns correct category after move"""
        article_id = test_article["article_id"]
        target_category_id = test_categories["parent"]["category_id"]
        
        # Move article
        session.put(f"{BASE_URL}/api/articles/{article_id}", json={
            "category_ids": [target_category_id]
        })
        
        # GET the article and verify
        response = session.get(f"{BASE_URL}/api/articles/{article_id}")
        assert response.status_code == 200
        article = response.json()
        
        assert target_category_id in article.get("category_ids", []), \
            "Category not persisted after move"


class TestCategoryHierarchyAPI:
    """Test category hierarchy for move dialog"""
    
    def test_get_categories_returns_hierarchy_data(self, session, categories):
        """Verify categories API returns parent_id for hierarchy"""
        # All categories should have parent_id field (can be null for root)
        for cat in categories:
            assert "parent_id" in cat, f"Category {cat.get('name')} missing parent_id field"
            assert "category_id" in cat
            assert "name" in cat
    
    def test_category_tree_structure(self, session, categories):
        """Test that category hierarchy is correctly structured"""
        root_categories = [c for c in categories if c.get("parent_id") is None]
        child_categories = [c for c in categories if c.get("parent_id") is not None]
        
        # Should have at least some root categories
        assert len(root_categories) > 0, "No root categories found"
        
        # All child categories should have valid parent
        parent_ids = {c["category_id"] for c in categories}
        for child in child_categories:
            assert child["parent_id"] in parent_ids, \
                f"Child {child['name']} has invalid parent_id {child['parent_id']}"


class TestDocumentFoldersAPI:
    """Test document folders API for image upload dialog folder tree"""
    
    def test_get_document_folders(self, session):
        """Test fetching document folders"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        assert response.status_code == 200, f"Failed to get folders: {response.text}"
        
        folders = response.json()
        assert isinstance(folders, list), "Folders should be a list"
    
    def test_folders_have_hierarchy_fields(self, session):
        """Test that folders have parent_id for hierarchical display"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        folders = response.json()
        
        for folder in folders:
            assert "folder_id" in folder, f"Folder missing folder_id: {folder}"
            assert "name" in folder, f"Folder missing name: {folder}"
            assert "parent_id" in folder, f"Folder missing parent_id: {folder}"
    
    def test_create_folder_for_images(self, session):
        """Test creating a new folder for image uploads"""
        unique_id = str(uuid.uuid4())[:8]
        folder_data = {
            "name": f"TEST_ImageFolder_{unique_id}",
            "parent_id": None
        }
        
        response = session.post(f"{BASE_URL}/api/document-folders", json=folder_data)
        assert response.status_code == 200, f"Failed to create folder: {response.text}"
        
        folder = response.json()
        assert folder["name"] == folder_data["name"]
        assert folder["parent_id"] is None
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/document-folders/{folder['folder_id']}")
    
    def test_create_nested_folder(self, session):
        """Test creating a nested folder structure"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create parent folder
        parent_data = {
            "name": f"TEST_ParentFolder_{unique_id}",
            "parent_id": None
        }
        parent_response = session.post(f"{BASE_URL}/api/document-folders", json=parent_data)
        assert parent_response.status_code == 200
        parent_folder = parent_response.json()
        
        # Create child folder
        child_data = {
            "name": f"TEST_ChildFolder_{unique_id}",
            "parent_id": parent_folder["folder_id"]
        }
        child_response = session.post(f"{BASE_URL}/api/document-folders", json=child_data)
        assert child_response.status_code == 200
        child_folder = child_response.json()
        
        # Verify hierarchy
        assert child_folder["parent_id"] == parent_folder["folder_id"]
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/document-folders/{child_folder['folder_id']}")
        session.delete(f"{BASE_URL}/api/document-folders/{parent_folder['folder_id']}")
    
    def test_folder_tree_for_image_upload(self, session):
        """Test folder tree structure suitable for image upload dialog"""
        response = session.get(f"{BASE_URL}/api/document-folders")
        folders = response.json()
        
        # Build tree structure (frontend does this)
        root_folders = [f for f in folders if f.get("parent_id") is None]
        
        # Verify we can build a tree
        folder_map = {f["folder_id"]: f for f in folders}
        for folder in folders:
            if folder["parent_id"]:
                assert folder["parent_id"] in folder_map or folder["parent_id"] is None, \
                    f"Folder {folder['name']} has invalid parent"


class TestArticlesByCategory:
    """Test filtering articles by category"""
    
    def test_get_articles_by_category(self, session, categories):
        """Test fetching articles by category"""
        # Get a category that likely has articles
        if len(categories) > 0:
            cat_id = categories[0]["category_id"]
            response = session.get(f"{BASE_URL}/api/articles/by-category/{cat_id}")
            assert response.status_code == 200, f"Failed to get articles by category: {response.text}"
            
            articles = response.json()
            assert isinstance(articles, list)
            
            # All returned articles should have this category
            for article in articles:
                category_ids = article.get("category_ids", [])
                # Also support legacy category_id field
                if not category_ids and article.get("category_id"):
                    category_ids = [article["category_id"]]
                assert cat_id in category_ids, \
                    f"Article {article.get('title')} not in category {cat_id}"
    
    def test_get_articles_for_nonexistent_category(self, session):
        """Test getting articles for a non-existent category returns empty list"""
        response = session.get(f"{BASE_URL}/api/articles/by-category/nonexistent_category_id")
        assert response.status_code == 200
        articles = response.json()
        assert articles == [], "Should return empty list for non-existent category"
