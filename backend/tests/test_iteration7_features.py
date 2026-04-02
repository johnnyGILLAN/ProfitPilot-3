"""
Test suite for ProfitPilot Iteration 7 Features:
1. Exchange Rates API (Currency Conversion)
2. Admin Panel (Stats + User Management)
3. Email Notifications (Preferences + Test Email)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://get-started-now-4.preview.emergentagent.com").rstrip("/")

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


class TestAuth:
    """Authentication tests - get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Verify login works and returns token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token length: {len(auth_token)}")


class TestExchangeRates:
    """Exchange Rates API tests - Currency Conversion feature"""
    
    def test_get_exchange_rates(self):
        """GET /api/exchange-rates returns success:true with rates object"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success should be True"
        assert "rates" in data, "rates object missing"
        assert "base" in data, "base currency missing"
        assert data["base"] == "USD", "base should be USD"
        
        # Verify some common currencies exist
        rates = data["rates"]
        assert "USD" in rates, "USD rate missing"
        assert "EUR" in rates, "EUR rate missing"
        assert "GBP" in rates, "GBP rate missing"
        assert "JPY" in rates, "JPY rate missing"
        
        # USD should be 1.0
        assert rates["USD"] == 1.0, "USD rate should be 1.0"
        
        print(f"Exchange rates fetched: {len(rates)} currencies, base: {data['base']}")
    
    def test_convert_currency_eur_to_usd(self):
        """GET /api/exchange-rates/convert converts EUR to USD"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/convert",
            params={"amount": 100, "from_currency": "EUR", "to_currency": "USD"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success should be True"
        assert "converted" in data, "converted amount missing"
        assert "original" in data, "original amount missing"
        assert "from" in data, "from currency missing"
        assert "to" in data, "to currency missing"
        assert "rate" in data, "rate missing"
        
        # Verify values
        assert data["original"] == 100, "original should be 100"
        assert data["from"] == "EUR", "from should be EUR"
        assert data["to"] == "USD", "to should be USD"
        assert data["converted"] > 0, "converted should be positive"
        
        print(f"Converted 100 EUR to {data['converted']} USD (rate: {data['rate']})")
    
    def test_convert_currency_usd_to_gbp(self):
        """GET /api/exchange-rates/convert converts USD to GBP"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/convert",
            params={"amount": 50, "from_currency": "USD", "to_currency": "GBP"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data["original"] == 50
        assert data["from"] == "USD"
        assert data["to"] == "GBP"
        assert data["converted"] > 0
        
        print(f"Converted 50 USD to {data['converted']} GBP")
    
    def test_convert_currency_same_currency(self):
        """Converting same currency returns same amount"""
        response = requests.get(
            f"{BASE_URL}/api/exchange-rates/convert",
            params={"amount": 100, "from_currency": "USD", "to_currency": "USD"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data["converted"] == 100, "Same currency conversion should return same amount"
        assert data["rate"] == 1.0, "Same currency rate should be 1.0"
        
        print("Same currency conversion works correctly")


class TestAdminPanel:
    """Admin Panel API tests - Stats and User Management"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats returns platform statistics (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success should be True"
        assert "stats" in data, "stats object missing"
        
        stats = data["stats"]
        assert "totalUsers" in stats, "totalUsers missing"
        assert "totalTransactions" in stats, "totalTransactions missing"
        assert "totalInvoices" in stats, "totalInvoices missing"
        assert "platformRevenue" in stats, "platformRevenue missing"
        
        # Verify types
        assert isinstance(stats["totalUsers"], int), "totalUsers should be int"
        assert isinstance(stats["totalTransactions"], int), "totalTransactions should be int"
        assert isinstance(stats["totalInvoices"], int), "totalInvoices should be int"
        
        print(f"Admin stats: {stats['totalUsers']} users, {stats['totalTransactions']} transactions, {stats['totalInvoices']} invoices")
    
    def test_admin_users_list(self, admin_token):
        """GET /api/admin/users returns list of users with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success should be True"
        assert "users" in data, "users array missing"
        assert isinstance(data["users"], list), "users should be array"
        
        # Verify at least one user exists
        assert len(data["users"]) > 0, "Should have at least one user"
        
        # Verify user object structure
        user = data["users"][0]
        assert "id" in user, "user.id missing"
        assert "name" in user, "user.name missing"
        assert "email" in user, "user.email missing"
        assert "role" in user, "user.role missing"
        assert "transactionCount" in user, "user.transactionCount missing"
        
        print(f"Admin users list: {len(data['users'])} users found")
    
    def test_admin_stats_unauthorized(self):
        """GET /api/admin/stats without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin stats correctly requires authentication")
    
    def test_admin_users_unauthorized(self):
        """GET /api/admin/users without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin users list correctly requires authentication")


class TestNotificationPreferences:
    """Email Notification Preferences API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_get_notification_preferences(self, auth_token):
        """GET /api/notifications/preferences returns preference settings"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "success should be True"
        assert "preferences" in data, "preferences object missing"
        
        prefs = data["preferences"]
        assert "emailNotifications" in prefs, "emailNotifications missing"
        assert "weeklyReports" in prefs, "weeklyReports missing"
        assert "overdueReminders" in prefs, "overdueReminders missing"
        assert "transactionAlerts" in prefs, "transactionAlerts missing"
        
        # Verify types (should be booleans)
        assert isinstance(prefs["emailNotifications"], bool), "emailNotifications should be bool"
        assert isinstance(prefs["weeklyReports"], bool), "weeklyReports should be bool"
        assert isinstance(prefs["overdueReminders"], bool), "overdueReminders should be bool"
        assert isinstance(prefs["transactionAlerts"], bool), "transactionAlerts should be bool"
        
        print(f"Notification preferences: emailNotifications={prefs['emailNotifications']}, weeklyReports={prefs['weeklyReports']}")
    
    def test_update_notification_preferences(self, auth_token):
        """PUT /api/notifications/preferences updates preferences"""
        new_prefs = {
            "preferences": {
                "emailNotifications": True,
                "weeklyReports": False,
                "overdueReminders": True,
                "transactionAlerts": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=new_prefs
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "success should be True"
        assert "message" in data, "message missing"
        
        # Verify update persisted by fetching again
        get_response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        prefs = get_data["preferences"]
        assert prefs["transactionAlerts"] == True, "transactionAlerts should be updated to True"
        
        print("Notification preferences updated and verified")
        
        # Reset to defaults
        reset_prefs = {
            "preferences": {
                "emailNotifications": True,
                "weeklyReports": True,
                "overdueReminders": True,
                "transactionAlerts": False
            }
        }
        requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=reset_prefs
        )
    
    def test_send_test_email(self, auth_token):
        """POST /api/notifications/send-test sends test email (may fail without RESEND_API_KEY)"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/send-test",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Response should have success and message fields
        assert "success" in data, "success field missing"
        assert "message" in data, "message field missing"
        
        # Note: success may be False if RESEND_API_KEY is not configured - this is expected
        if data["success"]:
            print(f"Test email sent successfully: {data['message']}")
        else:
            print(f"Test email not sent (expected if RESEND_API_KEY not configured): {data['message']}")
    
    def test_notification_preferences_unauthorized(self):
        """GET /api/notifications/preferences without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Notification preferences correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
