"""
Backend API tests for responsive design iteration
Tests: AI generate-goals endpoint (returns both goals[] and budgets[])
       POST /api/budgets with category field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIGenerateGoals:
    """Test AI generate-goals endpoint returns both goals and budgets"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@profitpilot.com",
            "password": "demo123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_generate_goals_returns_401_without_auth(self):
        """POST /api/ai/generate-goals returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/ai/generate-goals", json={
            "insights": [{"type": "spending", "title": "Test", "content": "Test content", "priority": "high"}]
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/ai/generate-goals returns 401 without auth")
    
    def test_generate_goals_without_insights_returns_message(self):
        """POST /api/ai/generate-goals without insights returns success:false with message"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            headers=self.headers,
            json={"insights": []}
        )
        # Should return 200 with success:false or a message
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        data = response.json()
        # Either success is false or there's an error message
        if response.status_code == 200:
            assert data.get("success") == False or "message" in data or len(data.get("goals", [])) == 0
        print("PASS: POST /api/ai/generate-goals without insights returns appropriate response")
    
    def test_generate_goals_returns_both_goals_and_budgets(self):
        """POST /api/ai/generate-goals returns BOTH 'goals' AND 'budgets' arrays"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            headers=self.headers,
            json={
                "insights": [
                    {"type": "spending", "title": "High Marketing Spend", "content": "Marketing expenses are 30% of revenue", "priority": "high"},
                    {"type": "saving", "title": "Opportunity to Save", "content": "Software subscriptions can be optimized", "priority": "medium"}
                ],
                "summary": {
                    "total_income": 50000,
                    "total_expense": 35000,
                    "net_profit": 15000,
                    "profit_margin": 30
                }
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check that response contains both goals and budgets arrays
        assert "goals" in data, "Response missing 'goals' array"
        assert "budgets" in data, "Response missing 'budgets' array"
        assert isinstance(data["goals"], list), "'goals' should be a list"
        assert isinstance(data["budgets"], list), "'budgets' should be a list"
        
        print(f"PASS: Response contains goals ({len(data['goals'])}) and budgets ({len(data['budgets'])})")
        
        # Validate goal structure if goals exist
        if len(data["goals"]) > 0:
            goal = data["goals"][0]
            required_goal_fields = ["title", "description", "targetAmount", "deadline", "category"]
            for field in required_goal_fields:
                assert field in goal, f"Goal missing required field: {field}"
            print(f"PASS: Goals have required fields: {required_goal_fields}")
        
        # Validate budget structure if budgets exist
        if len(data["budgets"]) > 0:
            budget = data["budgets"][0]
            required_budget_fields = ["category", "amount", "period"]
            for field in required_budget_fields:
                assert field in budget, f"Budget missing required field: {field}"
            print(f"PASS: Budgets have required fields: {required_budget_fields}")


class TestBudgetsAPI:
    """Test POST /api/budgets with category field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@profitpilot.com",
            "password": "demo123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_budget_returns_401_without_auth(self):
        """POST /api/budgets returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/budgets", json={
            "category": "Marketing",
            "amount": 500,
            "period": "monthly"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/budgets returns 401 without auth")
    
    def test_create_budget_with_category_field(self):
        """POST /api/budgets with category field creates budget successfully"""
        test_category = f"TEST_Marketing_{os.urandom(4).hex()}"
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            headers=self.headers,
            json={
                "category": test_category,
                "amount": 500,
                "period": "monthly"
            }
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify budget was created
        assert data.get("success") == True or "_id" in data or "id" in data.get("budget", {}), "Budget creation failed"
        print(f"PASS: POST /api/budgets with category field succeeds")
        
        # Cleanup - delete the test budget
        budget_id = data.get("budget", {}).get("_id") or data.get("_id") or data.get("id")
        if budget_id:
            requests.delete(f"{BASE_URL}/api/budgets/{budget_id}", headers=self.headers)
    
    def test_get_budgets_returns_list(self):
        """GET /api/budgets returns list of budgets"""
        response = requests.get(f"{BASE_URL}/api/budgets", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "GET /api/budgets should return success:true"
        assert "data" in data, "Response should contain 'data' field"
        assert isinstance(data["data"], list), "'data' should be a list"
        print(f"PASS: GET /api/budgets returns list with {len(data['data'])} budgets")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_is_accessible(self):
        """API base URL is accessible"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        # Health endpoint might not exist, so check for any response
        assert response.status_code in [200, 404], f"API not accessible: {response.status_code}"
        print(f"PASS: API is accessible at {BASE_URL}")
    
    def test_login_works(self):
        """Login endpoint works with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@profitpilot.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Login response missing token"
        print("PASS: Login works with demo credentials")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
