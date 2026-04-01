import requests
import sys
import json
from datetime import datetime

class ProfitPilotAPITester:
    def __init__(self, base_url="https://481a7a37-d9d1-43bb-af5b-d78606a965ce.preview.emergentagent.com"):
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
        """Test user login with existing test user"""
        login_data = {
            "email": "test@test.com",
            "password": "password123"
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

    # ============== Payment API Tests ==============
    
    def test_get_payment_packages(self):
        """Test GET /api/payments/packages"""
        success, response = self.run_api_test(
            "Get Payment Packages",
            "GET",
            "payments/packages",
            200
        )
        
        if success:
            # Verify response structure
            if 'packages' in response and isinstance(response['packages'], list):
                packages = response['packages']
                expected_packages = ['starter', 'professional', 'enterprise']
                found_packages = [pkg['id'] for pkg in packages]
                
                if all(pkg_id in found_packages for pkg_id in expected_packages):
                    self.log_test("Payment Packages Structure", True, f"Found packages: {found_packages}")
                else:
                    self.log_test("Payment Packages Structure", False, f"Missing packages. Expected: {expected_packages}, Found: {found_packages}")
            else:
                self.log_test("Payment Packages Structure", False, "Invalid response structure")
        
        return success

    def test_create_checkout_session(self):
        """Test POST /api/payments/checkout"""
        checkout_data = {
            "package_id": "starter",
            "origin_url": "https://test.example.com",
            "user_email": "test@test.com"
        }
        
        success, response = self.run_api_test(
            "Create Checkout Session",
            "POST",
            "payments/checkout",
            200,
            data=checkout_data
        )
        
        if success:
            # Verify response contains checkout_url and session_id
            if 'checkout_url' in response and 'session_id' in response:
                self.checkout_session_id = response['session_id']
                self.log_test("Checkout Response Structure", True, f"Session ID: {self.checkout_session_id}")
            else:
                self.log_test("Checkout Response Structure", False, "Missing checkout_url or session_id")
        
        return success

    def test_invalid_package_checkout(self):
        """Test checkout with invalid package ID"""
        invalid_checkout_data = {
            "package_id": "invalid_package",
            "origin_url": "https://test.example.com",
            "user_email": "test@test.com"
        }
        
        success, response = self.run_api_test(
            "Invalid Package Checkout",
            "POST",
            "payments/checkout",
            400,
            data=invalid_checkout_data
        )
        return success

    def test_get_payment_status(self):
        """Test GET /api/payments/status/{session_id}"""
        if not hasattr(self, 'checkout_session_id'):
            self.log_test("Payment Status Check", False, "No session ID available from previous test")
            return False
        
        success, response = self.run_api_test(
            "Get Payment Status",
            "GET",
            f"payments/status/{self.checkout_session_id}",
            200
        )
        
        if success:
            # Verify response structure
            required_fields = ['session_id', 'status', 'payment_status', 'amount', 'currency']
            if all(field in response for field in required_fields):
                self.log_test("Payment Status Structure", True, f"Status: {response.get('payment_status')}")
            else:
                missing_fields = [field for field in required_fields if field not in response]
                self.log_test("Payment Status Structure", False, f"Missing fields: {missing_fields}")
        
        return success

    def test_invalid_session_status(self):
        """Test payment status with invalid session ID"""
        success, response = self.run_api_test(
            "Invalid Session Status",
            "GET",
            "payments/status/invalid_session_id",
            500  # Expecting error from Stripe
        )
        return success

    def test_payment_history(self):
        """Test GET /api/payments/history"""
        success, response = self.run_api_test(
            "Get Payment History",
            "GET",
            "payments/history?email=test@test.com",
            200
        )
        
        if success:
            # Verify response structure
            if 'transactions' in response and isinstance(response['transactions'], list):
                self.log_test("Payment History Structure", True, f"Found {len(response['transactions'])} transactions")
            else:
                self.log_test("Payment History Structure", False, "Invalid response structure")
        
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
        
        # ============== Payment API Tests ==============
        print("\n🔍 Testing Payment APIs...")
        
        # Test payment packages
        self.test_get_payment_packages()
        
        # Test checkout session creation
        self.test_create_checkout_session()
        
        # Test payment status (depends on checkout session)
        self.test_get_payment_status()
        
        # Test error cases for payments
        self.test_invalid_package_checkout()
        self.test_invalid_session_status()
        
        # Test payment history
        self.test_payment_history()
        
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