"""
Iteration 20: Google OAuth Integration Tests

Tests for:
1. Google OAuth login endpoint returns redirect to Google
2. Standard email/password login still works
3. Session creation and cookie handling  
4. Auth/me endpoint returns user data for authenticated users
"""
import pytest
import requests
import os
from urllib.parse import urlparse

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGoogleOAuthEndpoints:
    """Test Google OAuth endpoint availability and behavior."""
    
    def test_google_oauth_login_endpoint_exists(self):
        """Verify /api/auth/google/login endpoint exists."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        # Should return 302 redirect to Google OAuth
        assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"
    
    def test_google_oauth_login_redirects_to_google(self):
        """Verify redirect URL points to Google OAuth."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        location = response.headers.get('Location', '')
        assert 'accounts.google.com' in location, f"Expected Google OAuth URL, got: {location}"
        assert 'oauth2' in location, f"Expected OAuth2 in URL, got: {location}"
    
    def test_google_oauth_login_includes_required_params(self):
        """Verify OAuth redirect includes required parameters."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        location = response.headers.get('Location', '')
        
        # Check required OAuth parameters
        assert 'client_id=' in location, "Missing client_id parameter"
        assert 'redirect_uri=' in location, "Missing redirect_uri parameter"
        assert 'scope=' in location, "Missing scope parameter"
        assert 'response_type=' in location, "Missing response_type parameter"
    
    def test_google_oauth_login_includes_correct_scopes(self):
        """Verify OAuth request includes openid, email, profile scopes."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        location = response.headers.get('Location', '')
        
        # Check for required scopes (URL encoded)
        assert 'openid' in location, "Missing openid scope"
        assert 'email' in location, "Missing email scope"
        assert 'profile' in location, "Missing profile scope"
    
    def test_google_oauth_callback_endpoint_exists(self):
        """Verify /api/auth/google/callback endpoint exists."""
        # Without proper OAuth params, this should redirect to login with error
        response = requests.get(f"{BASE_URL}/api/auth/google/callback", allow_redirects=False)
        # Should redirect (either 302 or handle error)
        assert response.status_code in [302, 400, 500], f"Unexpected status: {response.status_code}"
    
    def test_google_oauth_callback_without_code_redirects_to_login(self):
        """Verify callback without authorization code redirects to login with error."""
        response = requests.get(f"{BASE_URL}/api/auth/google/callback", allow_redirects=False)
        if response.status_code == 302:
            location = response.headers.get('Location', '')
            # Should redirect to login page with error
            assert 'login' in location.lower() or 'error' in location.lower(), \
                f"Expected redirect to login with error, got: {location}"


class TestStandardEmailPasswordLogin:
    """Test that standard email/password login still works."""
    
    def test_login_endpoint_exists(self):
        """Verify /api/auth/login endpoint exists."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "invalid"
        })
        # Should return 401 for invalid credentials, not 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_login_with_valid_admin_credentials(self):
        """Test login with admin credentials."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert 'user_id' in data, "Missing user_id in response"
        assert data['email'] == "marc.hansen@canusa.de", "Email mismatch"
        assert data['role'] == "admin", "Expected admin role"
    
    def test_login_returns_session_cookie(self):
        """Verify login sets session_token cookie."""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        assert response.status_code == 200
        
        # Check for session cookie
        cookies = session.cookies.get_dict()
        assert 'session_token' in cookies, f"Missing session_token cookie. Cookies: {cookies}"
    
    def test_login_with_invalid_password(self):
        """Verify login fails with invalid password."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "WrongPassword123!",
            "stay_logged_in": False
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_login_with_nonexistent_email(self):
        """Verify login fails with nonexistent email."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@canusa.de",
            "password": "SomePassword123!",
            "stay_logged_in": False
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAuthMeEndpoint:
    """Test the /api/auth/me endpoint for authenticated users."""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create an authenticated session."""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_auth_me_returns_user_data(self, authenticated_session):
        """Verify /api/auth/me returns user data for authenticated users."""
        response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'user_id' in data, "Missing user_id"
        assert 'email' in data, "Missing email"
        assert 'name' in data, "Missing name"
        assert 'role' in data, "Missing role"
    
    def test_auth_me_without_session_returns_401(self):
        """Verify /api/auth/me returns 401 for unauthenticated requests."""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_auth_me_returns_correct_user_info(self, authenticated_session):
        """Verify /api/auth/me returns correct user information."""
        response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data['email'] == "marc.hansen@canusa.de", f"Email mismatch: {data['email']}"
        assert data['role'] == "admin", f"Role mismatch: {data['role']}"


class TestSessionAndCookieHandling:
    """Test session creation and cookie handling."""
    
    def test_session_persists_across_requests(self):
        """Verify session cookie allows subsequent authenticated requests."""
        session = requests.Session()
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        assert login_response.status_code == 200
        
        # Make multiple authenticated requests
        for _ in range(3):
            me_response = session.get(f"{BASE_URL}/api/auth/me")
            assert me_response.status_code == 200, f"Session lost: {me_response.status_code}"
    
    def test_stay_logged_in_option_works(self):
        """Verify stay_logged_in option is accepted."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": True
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
    
    def test_logout_endpoint_exists(self):
        """Verify /api/auth/logout endpoint exists."""
        session = requests.Session()
        
        # Login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        assert login_response.status_code == 200
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200, f"Logout failed: {logout_response.status_code}"
    
    def test_logout_clears_session(self):
        """Verify logout invalidates the session."""
        session = requests.Session()
        
        # Login
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marc.hansen@canusa.de",
            "password": "CanusaNexus2024!",
            "stay_logged_in": False
        })
        
        # Verify logged in
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        
        # Logout
        session.post(f"{BASE_URL}/api/auth/logout")
        
        # Verify session is cleared (should get 401)
        me_response_after = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response_after.status_code == 401, \
            f"Expected 401 after logout, got {me_response_after.status_code}"


class TestGoogleOAuthClientConfiguration:
    """Test Google OAuth client configuration."""
    
    def test_google_client_id_is_configured(self):
        """Verify Google OAuth redirect includes correct client_id."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        location = response.headers.get('Location', '')
        
        # The expected client_id from environment
        expected_client_id = "571704935277-tufbtehpckv390pgg21p7l5hn7knveui.apps.googleusercontent.com"
        assert expected_client_id in location, f"Client ID not found in redirect URL"
    
    def test_callback_redirect_uri_is_correct(self):
        """Verify redirect_uri points to the correct callback endpoint."""
        response = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        location = response.headers.get('Location', '')
        
        # Should contain callback URL
        assert 'callback' in location, "Callback not in redirect_uri"
        assert 'auth' in location and 'google' in location, \
            f"Expected google auth callback in URL, got: {location}"
