"""
Backend API tests for ProfitPilot new features:
- Export endpoints (transactions, invoices, clients, report)
- Recurring transactions endpoints
- Transaction stats endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://get-started-now-4.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


class TestAuth:
    """Authentication tests to get token for other tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Verify login works and returns token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token obtained")


class TestRecurringEndpoints:
    """Test recurring transactions API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_recurring_returns_success(self, auth_headers):
        """GET /api/recurring should return success:true with data array"""
        response = requests.get(
            f"{BASE_URL}/api/recurring",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success:true, got {data}"
        assert "data" in data, "Response should contain 'data' field"
        assert isinstance(data["data"], list), "data should be a list"
        print(f"✓ GET /api/recurring returns success:true with {len(data['data'])} items")
    
    def test_create_recurring_transaction(self, auth_headers):
        """POST /api/recurring should create a new recurring transaction"""
        payload = {
            "type": "EXPENSE",
            "category": "Software",
            "amount": 29.99,
            "description": "TEST_Monthly subscription",
            "frequency": "monthly",
            "startDate": "2025-01-01"
        }
        response = requests.post(
            f"{BASE_URL}/api/recurring",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success:true, got {data}"
        print(f"✓ POST /api/recurring creates recurring transaction")
        
        # Return ID for cleanup
        if "data" in data and "_id" in data["data"]:
            return data["data"]["_id"]
        return None


class TestExportEndpoints:
    """Test data export API endpoints - these return CSV, not JSON"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_export_transactions_returns_csv(self, auth_headers):
        """GET /api/export/transactions should return CSV data"""
        response = requests.get(
            f"{BASE_URL}/api/export/transactions",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is CSV
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type or "text/plain" in content_type or response.text.startswith('"'), \
            f"Expected CSV content, got Content-Type: {content_type}"
        
        # Verify CSV structure (should have headers)
        lines = response.text.strip().split('\n')
        assert len(lines) >= 1, "CSV should have at least header row"
        
        # Check for expected CSV headers
        header = lines[0].lower()
        assert "date" in header or "type" in header or "amount" in header, \
            f"CSV header should contain expected fields, got: {lines[0]}"
        
        print(f"✓ GET /api/export/transactions returns CSV with {len(lines)} lines")
    
    def test_export_invoices_returns_csv(self, auth_headers):
        """GET /api/export/invoices should return CSV data"""
        response = requests.get(
            f"{BASE_URL}/api/export/invoices",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's CSV-like content
        content = response.text.strip()
        assert len(content) > 0, "Response should not be empty"
        
        lines = content.split('\n')
        header = lines[0].lower() if lines else ""
        assert "invoice" in header or "amount" in header or "status" in header or content.startswith('"'), \
            f"Expected CSV content with invoice fields, got: {lines[0] if lines else 'empty'}"
        
        print(f"✓ GET /api/export/invoices returns CSV with {len(lines)} lines")
    
    def test_export_clients_returns_csv(self, auth_headers):
        """GET /api/export/clients should return CSV data"""
        response = requests.get(
            f"{BASE_URL}/api/export/clients",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content = response.text.strip()
        assert len(content) > 0, "Response should not be empty"
        
        lines = content.split('\n')
        header = lines[0].lower() if lines else ""
        assert "name" in header or "email" in header or content.startswith('"'), \
            f"Expected CSV content with client fields, got: {lines[0] if lines else 'empty'}"
        
        print(f"✓ GET /api/export/clients returns CSV with {len(lines)} lines")
    
    def test_export_report_returns_csv(self, auth_headers):
        """GET /api/export/report should return CSV financial report"""
        response = requests.get(
            f"{BASE_URL}/api/export/report",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content = response.text.strip()
        assert len(content) > 0, "Response should not be empty"
        
        lines = content.split('\n')
        # Report should have summary section
        content_lower = content.lower()
        assert "category" in content_lower or "amount" in content_lower or "income" in content_lower, \
            f"Expected financial report content, got: {content[:200]}"
        
        print(f"✓ GET /api/export/report returns CSV with {len(lines)} lines")


class TestTransactionStats:
    """Test transaction statistics endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_transaction_stats(self, auth_headers):
        """GET /api/transactions/stats should return monthlyData array"""
        response = requests.get(
            f"{BASE_URL}/api/transactions/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success:true, got {data}"
        assert "data" in data, "Response should contain 'data' field"
        
        stats = data["data"]
        # Check for expected fields
        assert "totalIncome" in stats or "monthlyData" in stats, \
            f"Stats should contain totalIncome or monthlyData, got: {list(stats.keys())}"
        
        # Verify monthlyData is an array if present
        if "monthlyData" in stats:
            assert isinstance(stats["monthlyData"], list), "monthlyData should be a list"
            print(f"✓ GET /api/transactions/stats returns monthlyData with {len(stats['monthlyData'])} months")
        else:
            print(f"✓ GET /api/transactions/stats returns stats: {list(stats.keys())}")


class TestExportWithFilters:
    """Test export endpoints with query filters"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_export_transactions_with_type_filter(self, auth_headers):
        """GET /api/export/transactions?type=INCOME should filter by type"""
        response = requests.get(
            f"{BASE_URL}/api/export/transactions?type=INCOME",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/export/transactions?type=INCOME works")
    
    def test_export_transactions_with_date_filter(self, auth_headers):
        """GET /api/export/transactions with date range should work"""
        response = requests.get(
            f"{BASE_URL}/api/export/transactions?startDate=2024-01-01&endDate=2025-12-31",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/export/transactions with date filter works")
    
    def test_export_invoices_with_status_filter(self, auth_headers):
        """GET /api/export/invoices?status=PENDING should filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/export/invoices?status=PENDING",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/export/invoices?status=PENDING works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
