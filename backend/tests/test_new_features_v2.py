"""
Test suite for ProfitPilot new features:
1. Multi-Currency support on transactions
2. Tax Calculator country selection (backend doesn't have tax API - frontend only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('NEXT_PUBLIC_API_BASE_URL', 'https://get-started-now-4.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestMultiCurrencyTransactions:
    """Multi-Currency feature tests for transactions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_transaction_with_eur_currency(self, auth_headers):
        """Test creating a transaction with EUR currency"""
        payload = {
            "date": "2026-01-15",
            "type": "EXPENSE",
            "category": "Software",
            "amount": 99.99,
            "currency": "EUR",
            "description": "TEST_EUR_Transaction - Software subscription",
            "tags": ["test", "eur"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Failed to create transaction: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["currency"] == "EUR", f"Expected EUR, got {data['data'].get('currency')}"
        assert data["data"]["amount"] == 99.99
        print(f"✓ Created EUR transaction: {data['data']['_id']}")
        
        # Store ID for cleanup
        return data["data"]["_id"]
    
    def test_create_transaction_with_gbp_currency(self, auth_headers):
        """Test creating a transaction with GBP currency"""
        payload = {
            "date": "2026-01-15",
            "type": "INCOME",
            "category": "Consulting",
            "amount": 500.00,
            "currency": "GBP",
            "description": "TEST_GBP_Transaction - Consulting fee",
            "tags": ["test", "gbp"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Failed to create transaction: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["data"]["currency"] == "GBP"
        print(f"✓ Created GBP transaction: {data['data']['_id']}")
        return data["data"]["_id"]
    
    def test_create_transaction_with_inr_currency(self, auth_headers):
        """Test creating a transaction with INR currency"""
        payload = {
            "date": "2026-01-15",
            "type": "EXPENSE",
            "category": "Equipment",
            "amount": 15000.00,
            "currency": "INR",
            "description": "TEST_INR_Transaction - Equipment purchase",
            "tags": ["test", "inr"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Failed to create transaction: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["data"]["currency"] == "INR"
        print(f"✓ Created INR transaction: {data['data']['_id']}")
        return data["data"]["_id"]
    
    def test_create_transaction_default_usd_currency(self, auth_headers):
        """Test that transactions default to USD when no currency specified"""
        payload = {
            "date": "2026-01-15",
            "type": "EXPENSE",
            "category": "Office Supplies",
            "amount": 50.00,
            "description": "TEST_USD_Default - Office supplies",
            "tags": ["test", "default"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Failed to create transaction: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["data"]["currency"] == "USD", f"Expected USD default, got {data['data'].get('currency')}"
        print(f"✓ Created transaction with default USD currency: {data['data']['_id']}")
        return data["data"]["_id"]
    
    def test_get_transactions_returns_currency_field(self, auth_headers):
        """Test that GET /api/transactions returns currency field"""
        response = requests.get(
            f"{BASE_URL}/api/transactions?limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get transactions: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        # Check that transactions have currency field
        for transaction in data["data"]:
            assert "currency" in transaction, f"Transaction {transaction.get('_id')} missing currency field"
        
        print(f"✓ GET /api/transactions returns currency field for all {len(data['data'])} transactions")
    
    def test_update_transaction_currency(self, auth_headers):
        """Test updating a transaction's currency"""
        # First create a transaction
        create_payload = {
            "date": "2026-01-15",
            "type": "EXPENSE",
            "category": "Travel",
            "amount": 200.00,
            "currency": "USD",
            "description": "TEST_Update_Currency - Travel expense",
            "tags": ["test", "update"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/transactions",
            json=create_payload,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        transaction_id = create_response.json()["data"]["_id"]
        
        # Update the currency to CAD
        update_payload = {
            "date": "2026-01-15",
            "type": "EXPENSE",
            "category": "Travel",
            "amount": 200.00,
            "currency": "CAD",
            "description": "TEST_Update_Currency - Travel expense (updated)",
            "tags": ["test", "update"]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/transactions/{transaction_id}",
            json=update_payload,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Failed to update transaction: {update_response.text}"
        data = update_response.json()
        assert data["success"] is True
        assert data["data"]["currency"] == "CAD", f"Expected CAD, got {data['data'].get('currency')}"
        print(f"✓ Updated transaction currency from USD to CAD")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/transactions/{transaction_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["data"]["currency"] == "CAD"
        print(f"✓ Verified currency update persisted")


class TestTransactionStats:
    """Test transaction statistics endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_transaction_stats(self, auth_headers):
        """Test GET /api/transactions/stats returns expected data"""
        response = requests.get(
            f"{BASE_URL}/api/transactions/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        stats = data["data"]
        assert "totalIncome" in stats
        assert "totalExpense" in stats
        assert "balance" in stats
        assert "monthlyData" in stats
        
        print(f"✓ Transaction stats: Income={stats['totalIncome']}, Expense={stats['totalExpense']}, Balance={stats['balance']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_transactions(self, auth_headers):
        """Clean up TEST_ prefixed transactions"""
        # Get all transactions
        response = requests.get(
            f"{BASE_URL}/api/transactions?limit=100",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            test_transactions = [
                t for t in data.get("data", [])
                if t.get("description", "").startswith("TEST_")
            ]
            
            deleted_count = 0
            for t in test_transactions:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/transactions/{t['_id']}",
                    headers=auth_headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
            
            print(f"✓ Cleaned up {deleted_count} test transactions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
