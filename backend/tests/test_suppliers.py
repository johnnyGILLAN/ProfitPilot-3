"""
Test suite for Suppliers API - CRUD operations, search, and auth protection
Tests the new Suppliers feature that mirrors the Clients page functionality
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('NEXT_PUBLIC_API_BASE_URL', 'https://ai-insights-stage.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


class TestSuppliersAuth:
    """Test authentication requirements for Suppliers endpoints"""
    
    def test_get_suppliers_without_auth_returns_401(self):
        """GET /api/suppliers without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: GET /api/suppliers without auth returns 401")
    
    def test_post_supplier_without_auth_returns_401(self):
        """POST /api/suppliers without token should return 401"""
        response = requests.post(f"{BASE_URL}/api/suppliers", json={
            "name": "Test Supplier",
            "email": "test@supplier.com"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: POST /api/suppliers without auth returns 401")


class TestSuppliersCRUD:
    """Test CRUD operations for Suppliers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("token")
        assert self.token, "No token in login response"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        print(f"Auth setup complete with token")
    
    def test_get_suppliers_returns_list(self):
        """GET /api/suppliers returns list with count and total"""
        response = requests.get(f"{BASE_URL}/api/suppliers", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success:true, got {data}"
        assert "data" in data, "Response missing 'data' field"
        assert "count" in data, "Response missing 'count' field"
        assert "total" in data, "Response missing 'total' field"
        assert isinstance(data["data"], list), "data should be a list"
        print(f"PASS: GET /api/suppliers returns list with {data['count']} suppliers (total: {data['total']})")
    
    def test_create_supplier_success(self):
        """POST /api/suppliers creates a new supplier (201)"""
        supplier_data = {
            "name": "TEST_New Supplier",
            "email": "test_new@supplier.com",
            "phone": "+1-555-123-4567",
            "company": "TEST_Supplier Corp",
            "address": "123 Test Street, Test City",
            "notes": "Test supplier for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success:true, got {data}"
        assert "data" in data, "Response missing 'data' field"
        
        created = data["data"]
        assert created["name"] == supplier_data["name"], f"Name mismatch: {created['name']}"
        assert created["email"] == supplier_data["email"], f"Email mismatch: {created['email']}"
        assert created["phone"] == supplier_data["phone"], f"Phone mismatch"
        assert created["company"] == supplier_data["company"], f"Company mismatch"
        assert "_id" in created, "Created supplier missing _id"
        
        # Store for cleanup
        self.created_supplier_id = created["_id"]
        print(f"PASS: POST /api/suppliers creates supplier with id {self.created_supplier_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{self.created_supplier_id}", headers=self.headers)
    
    def test_create_and_get_supplier_by_id(self):
        """Create supplier then GET by ID to verify persistence"""
        # Create
        supplier_data = {
            "name": "TEST_GetById Supplier",
            "email": "test_getbyid@supplier.com",
            "company": "TEST_GetById Corp"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201, f"Create failed: {create_response.text}"
        
        created = create_response.json()["data"]
        supplier_id = created["_id"]
        
        # GET by ID
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
        assert get_response.status_code == 200, f"GET by ID failed: {get_response.text}"
        
        fetched = get_response.json()
        assert fetched.get("success") == True
        assert fetched["data"]["_id"] == supplier_id
        assert fetched["data"]["name"] == supplier_data["name"]
        assert fetched["data"]["email"] == supplier_data["email"]
        print(f"PASS: GET /api/suppliers/{supplier_id} returns correct supplier")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
    
    def test_update_supplier(self):
        """PUT /api/suppliers/:id updates a supplier"""
        # Create first
        supplier_data = {
            "name": "TEST_Update Supplier",
            "email": "test_update@supplier.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201
        supplier_id = create_response.json()["data"]["_id"]
        
        # Update
        update_data = {
            "name": "TEST_Updated Supplier Name",
            "email": "test_updated@supplier.com",
            "phone": "+1-555-999-8888",
            "company": "Updated Corp"
        }
        update_response = requests.put(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers, json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated.get("success") == True
        assert updated["data"]["name"] == update_data["name"]
        assert updated["data"]["email"] == update_data["email"]
        assert updated["data"]["phone"] == update_data["phone"]
        print(f"PASS: PUT /api/suppliers/{supplier_id} updates supplier correctly")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
        fetched = get_response.json()["data"]
        assert fetched["name"] == update_data["name"], "Update not persisted"
        print("PASS: Update persisted correctly (verified with GET)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
    
    def test_delete_supplier(self):
        """DELETE /api/suppliers/:id deletes a supplier"""
        # Create first
        supplier_data = {
            "name": "TEST_Delete Supplier",
            "email": "test_delete@supplier.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201
        supplier_id = create_response.json()["data"]["_id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        deleted = delete_response.json()
        assert deleted.get("success") == True
        print(f"PASS: DELETE /api/suppliers/{supplier_id} returns success")
        
        # Verify deletion with GET (should return 404)
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
        assert get_response.status_code == 404, f"Expected 404 after delete, got {get_response.status_code}"
        print("PASS: Deleted supplier returns 404 on GET (verified removal)")
    
    def test_search_suppliers_by_name(self):
        """GET /api/suppliers?search=acme filters suppliers by name"""
        # Create a supplier with searchable name
        supplier_data = {
            "name": "TEST_Acme Searchable",
            "email": "test_acme@search.com",
            "company": "Acme Test Corp"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201
        supplier_id = create_response.json()["data"]["_id"]
        
        # Search by name
        search_response = requests.get(f"{BASE_URL}/api/suppliers?search=Acme", headers=self.headers)
        assert search_response.status_code == 200, f"Search failed: {search_response.text}"
        
        data = search_response.json()
        assert data.get("success") == True
        # Should find at least our test supplier
        found_names = [s["name"] for s in data["data"]]
        assert any("Acme" in name for name in found_names), f"Search for 'Acme' didn't find expected results: {found_names}"
        print(f"PASS: GET /api/suppliers?search=Acme returns filtered results ({len(data['data'])} found)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
    
    def test_search_suppliers_by_email(self):
        """GET /api/suppliers?search=email filters suppliers by email"""
        # Create a supplier with unique email
        supplier_data = {
            "name": "TEST_Email Search",
            "email": "uniqueemail123@testsearch.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201
        supplier_id = create_response.json()["data"]["_id"]
        
        # Search by email
        search_response = requests.get(f"{BASE_URL}/api/suppliers?search=uniqueemail123", headers=self.headers)
        assert search_response.status_code == 200
        
        data = search_response.json()
        assert len(data["data"]) >= 1, "Email search should find at least one result"
        found_emails = [s["email"] for s in data["data"]]
        assert any("uniqueemail123" in email for email in found_emails), f"Email search failed: {found_emails}"
        print(f"PASS: GET /api/suppliers?search=uniqueemail123 filters by email")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
    
    def test_search_suppliers_by_company(self):
        """GET /api/suppliers?search=company filters suppliers by company"""
        # Create a supplier with unique company
        supplier_data = {
            "name": "TEST_Company Search",
            "email": "company@testsearch.com",
            "company": "UniqueCompanyXYZ789"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", headers=self.headers, json=supplier_data)
        assert create_response.status_code == 201
        supplier_id = create_response.json()["data"]["_id"]
        
        # Search by company
        search_response = requests.get(f"{BASE_URL}/api/suppliers?search=UniqueCompanyXYZ789", headers=self.headers)
        assert search_response.status_code == 200
        
        data = search_response.json()
        assert len(data["data"]) >= 1, "Company search should find at least one result"
        print(f"PASS: GET /api/suppliers?search=UniqueCompanyXYZ789 filters by company")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}", headers=self.headers)
    
    def test_get_nonexistent_supplier_returns_404(self):
        """GET /api/suppliers/:id with invalid ID returns 404"""
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        response = requests.get(f"{BASE_URL}/api/suppliers/{fake_id}", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET /api/suppliers with nonexistent ID returns 404")


class TestSuppliersCleanup:
    """Cleanup any TEST_ prefixed suppliers after all tests"""
    
    def test_cleanup_test_suppliers(self):
        """Remove any TEST_ prefixed suppliers created during testing"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all suppliers
        response = requests.get(f"{BASE_URL}/api/suppliers?limit=100", headers=headers)
        if response.status_code == 200:
            suppliers = response.json().get("data", [])
            test_suppliers = [s for s in suppliers if s["name"].startswith("TEST_")]
            
            for supplier in test_suppliers:
                delete_response = requests.delete(f"{BASE_URL}/api/suppliers/{supplier['_id']}", headers=headers)
                if delete_response.status_code == 200:
                    print(f"Cleaned up test supplier: {supplier['name']}")
            
            print(f"PASS: Cleanup complete - removed {len(test_suppliers)} test suppliers")
        else:
            print("PASS: Cleanup skipped (could not fetch suppliers)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
