import requests
import sys
import json
from datetime import datetime

class ProfitPilotAPITester:
    def __init__(self, base_url="https://get-started-now-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                details = f"Status: {response.status_code}, Response: {json.dumps(response_data, indent=2)}"
            except:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            return success, response_data if success else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "name": "Test User",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "password123"
        }
        
        success, response = self.run_api_test(
            "User Registration",
            "POST",
            "auth/register",
            201,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.test_user_email = test_user_data['email']
            return True
        return False

    def test_user_login(self):
        """Test user login with demo credentials"""
        login_data = {
            "email": "demo@profitpilot.com",
            "password": "demo123"
        }
        
        success, response = self.run_api_test(
            "User Login (existing user)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_api_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_api_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data=invalid_data
        )
        return success

    def test_missing_fields_registration(self):
        """Test registration with missing fields"""
        incomplete_data = {
            "email": "incomplete@example.com"
            # Missing name and password
        }
        
        success, response = self.run_api_test(
            "Registration with Missing Fields",
            "POST",
            "auth/register",
            500,  # Expecting error
            data=incomplete_data
        )
        return success

    def test_duplicate_user_registration(self):
        """Test registering with existing email"""
        duplicate_data = {
            "name": "Duplicate User",
            "email": "test@test.com",  # Existing user
            "password": "password123"
        }
        
        success, response = self.run_api_test(
            "Duplicate User Registration",
            "POST",
            "auth/register",
            400,
            data=duplicate_data
        )
        return success

    # ============== Core Feature API Tests ==============
    
    def test_transactions_crud(self):
        """Test transactions CRUD operations"""
        # Test GET transactions
        success, response = self.run_api_test(
            "Get Transactions",
            "GET",
            "transactions?limit=10",
            200
        )
        
        if not success:
            return False
        
        # Test transaction stats
        success, response = self.run_api_test(
            "Get Transaction Stats",
            "GET",
            "transactions/stats",
            200
        )
        
        if not success:
            return False
        
        # Test CREATE transaction
        transaction_data = {
            "date": "2024-01-15",
            "type": "EXPENSE",
            "category": "Office Supplies",
            "amount": 150.50,
            "description": "Test transaction",
            "tags": ["test", "api"]
        }
        
        success, response = self.run_api_test(
            "Create Transaction",
            "POST",
            "transactions",
            201,
            data=transaction_data
        )
        
        if success and 'data' in response:
            self.test_transaction_id = response['data']['_id']
            self.log_test("Transaction Creation", True, f"Created transaction ID: {self.test_transaction_id}")
        else:
            return False
        
        # Test UPDATE transaction
        if hasattr(self, 'test_transaction_id'):
            update_data = {
                "amount": 200.00,
                "description": "Updated test transaction"
            }
            
            success, response = self.run_api_test(
                "Update Transaction",
                "PUT",
                f"transactions/{self.test_transaction_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        # Test DELETE transaction
        if hasattr(self, 'test_transaction_id'):
            success, response = self.run_api_test(
                "Delete Transaction",
                "DELETE",
                f"transactions/{self.test_transaction_id}",
                200
            )
            
            if not success:
                return False
        
        return True

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        # Test GET clients
        success, response = self.run_api_test(
            "Get Clients",
            "GET",
            "clients?limit=10",
            200
        )
        
        if not success:
            return False
        
        # Test CREATE client
        client_data = {
            "name": "Test Client",
            "email": "testclient@example.com",
            "phone": "+1234567890",
            "company": "Test Company",
            "address": "123 Test St",
            "notes": "Test client for API testing"
        }
        
        success, response = self.run_api_test(
            "Create Client",
            "POST",
            "clients",
            201,
            data=client_data
        )
        
        if success and 'data' in response:
            self.test_client_id = response['data']['_id']
            self.log_test("Client Creation", True, f"Created client ID: {self.test_client_id}")
        else:
            return False
        
        # Test UPDATE client
        if hasattr(self, 'test_client_id'):
            update_data = {
                "name": "Updated Test Client",
                "company": "Updated Test Company"
            }
            
            success, response = self.run_api_test(
                "Update Client",
                "PUT",
                f"clients/{self.test_client_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        # Test DELETE client
        if hasattr(self, 'test_client_id'):
            success, response = self.run_api_test(
                "Delete Client",
                "DELETE",
                f"clients/{self.test_client_id}",
                200
            )
            
            if not success:
                return False
        
        return True

    def test_invoices_crud(self):
        """Test invoices CRUD operations"""
        # Test GET invoices
        success, response = self.run_api_test(
            "Get Invoices",
            "GET",
            "invoices?limit=10",
            200
        )
        
        if not success:
            return False
        
        # Test CREATE invoice
        invoice_data = {
            "clientEmail": "testclient@example.com",
            "invoiceNumber": f"INV-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "date": "2024-01-15",
            "dueDate": "2024-02-15",
            "items": [
                {
                    "description": "Test Service",
                    "quantity": 2,
                    "unitPrice": 100.00
                }
            ],
            "notes": "Test invoice",
            "status": "PENDING"
        }
        
        success, response = self.run_api_test(
            "Create Invoice",
            "POST",
            "invoices",
            201,
            data=invoice_data
        )
        
        if success and 'data' in response:
            self.test_invoice_id = response['data']['_id']
            self.log_test("Invoice Creation", True, f"Created invoice ID: {self.test_invoice_id}")
        else:
            return False
        
        # Test mark invoice as paid
        if hasattr(self, 'test_invoice_id'):
            success, response = self.run_api_test(
                "Mark Invoice as Paid",
                "PUT",
                f"invoices/{self.test_invoice_id}/paid",
                200
            )
            
            if not success:
                return False
        
        # Test DELETE invoice
        if hasattr(self, 'test_invoice_id'):
            success, response = self.run_api_test(
                "Delete Invoice",
                "DELETE",
                f"invoices/{self.test_invoice_id}",
                200
            )
            
            if not success:
                return False
        
        return True

    def test_categories_api(self):
        """Test categories API"""
        success, response = self.run_api_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        return success

    def test_budgets_api(self):
        """Test budgets API"""
        success, response = self.run_api_test(
            "Get Budgets",
            "GET",
            "budgets",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ProfitPilot API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)

        # Test registration first
        if not self.test_user_registration():
            print("❌ Registration failed, trying with existing user login")
        
        # Test login with existing user
        if not self.test_user_login():
            print("❌ Login failed, cannot proceed with authenticated tests")
            return False
        
        # Test authenticated endpoints
        self.test_get_user_profile()
        
        # Test error cases
        self.test_invalid_login()
        self.test_missing_fields_registration()
        self.test_duplicate_user_registration()
        
        # ============== Core Feature API Tests ==============
        print("\n🔍 Testing Core Feature APIs...")
        
        # Test transactions CRUD
        self.test_transactions_crud()
        
        # Test clients CRUD
        self.test_clients_crud()
        
        # Test invoices CRUD
        self.test_invoices_crud()
        
        # Test categories
        self.test_categories_api()
        
        # Test budgets
        self.test_budgets_api()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test_name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ProfitPilotAPITester()
    
    try:
        tester.run_all_tests()
        success = tester.print_summary()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())