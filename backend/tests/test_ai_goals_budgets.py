"""
Test suite for AI Goals + Budgets generation feature (Iteration 10)
Tests the enhancement where POST /api/ai/generate-goals returns BOTH goals AND budgets arrays.
Also tests budget creation via POST /api/budgets with category field mapping.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('NEXT_PUBLIC_API_BASE_URL', 'https://get-started-now-4.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAIGenerateGoalsAndBudgets:
    """Tests for POST /api/ai/generate-goals endpoint returning both goals and budgets"""

    def test_generate_goals_returns_401_without_auth(self):
        """Endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": [], "summary": {}},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/ai/generate-goals returns 401 without auth")

    def test_generate_goals_without_insights_returns_error(self, auth_headers):
        """Endpoint returns error when no insights provided"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": [], "summary": {}},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == False, "Expected success=False when no insights"
        assert "message" in data, "Expected error message"
        print("PASS: /api/ai/generate-goals returns error when no insights provided")

    def test_generate_goals_returns_goals_and_budgets_arrays(self, auth_headers):
        """Endpoint returns BOTH goals and budgets arrays"""
        # Sample insights to generate goals and budgets from
        test_insights = [
            {
                "type": "spending",
                "title": "High Marketing Spend",
                "content": "Your marketing expenses are 30% higher than industry average. Consider optimizing ad spend.",
                "priority": "high"
            },
            {
                "type": "saving",
                "title": "Emergency Fund Needed",
                "content": "Build an emergency fund covering 3-6 months of expenses.",
                "priority": "medium"
            },
            {
                "type": "income",
                "title": "Revenue Growth Opportunity",
                "content": "Diversify income streams to reduce dependency on single client.",
                "priority": "high"
            }
        ]
        test_summary = {
            "total_income": 50000,
            "total_expense": 35000,
            "net_profit": 15000,
            "profit_margin": 30.0
        }

        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": test_insights, "summary": test_summary},
            headers=auth_headers,
            timeout=30  # AI calls can take time
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "goals" in data, "Response must contain 'goals' array"
        assert "budgets" in data, "Response must contain 'budgets' array"
        assert isinstance(data["goals"], list), "goals must be a list"
        assert isinstance(data["budgets"], list), "budgets must be a list"
        
        print(f"PASS: /api/ai/generate-goals returns goals ({len(data['goals'])}) and budgets ({len(data['budgets'])})")

    def test_generated_goals_have_required_fields(self, auth_headers):
        """Each goal has required fields: title, description, targetAmount, currentAmount, deadline, category"""
        test_insights = [
            {"type": "saving", "title": "Build Savings", "content": "Save more money", "priority": "high"}
        ]
        test_summary = {"total_income": 10000, "total_expense": 7000, "net_profit": 3000, "profit_margin": 30.0}

        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": test_insights, "summary": test_summary},
            headers=auth_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("goals") and len(data["goals"]) > 0:
            goal = data["goals"][0]
            required_fields = ["title", "description", "targetAmount", "currentAmount", "deadline", "category"]
            for field in required_fields:
                assert field in goal, f"Goal missing required field: {field}"
            print(f"PASS: Generated goals have all required fields: {required_fields}")
        else:
            print("SKIP: No goals generated to validate fields")

    def test_generated_budgets_have_required_fields(self, auth_headers):
        """Each budget has required fields: category, amount, period"""
        test_insights = [
            {"type": "spending", "title": "Control Expenses", "content": "Reduce spending", "priority": "high"}
        ]
        test_summary = {"total_income": 10000, "total_expense": 8000, "net_profit": 2000, "profit_margin": 20.0}

        response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": test_insights, "summary": test_summary},
            headers=auth_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("budgets") and len(data["budgets"]) > 0:
            budget = data["budgets"][0]
            required_fields = ["category", "amount", "period"]
            for field in required_fields:
                assert field in budget, f"Budget missing required field: {field}"
            print(f"PASS: Generated budgets have all required fields: {required_fields}")
        else:
            print("SKIP: No budgets generated to validate fields")


class TestBudgetCreation:
    """Tests for POST /api/budgets with category field mapping"""

    def test_create_budget_returns_401_without_auth(self):
        """Budget creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            json={"category": "Marketing", "amount": 500, "period": "monthly"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/budgets returns 401 without auth")

    def test_create_budget_with_category_field(self, auth_headers):
        """Budget creation accepts 'category' field (maps to 'name' in DB)"""
        test_budget = {
            "category": f"TEST_Marketing_{int(time.time())}",
            "amount": 500,
            "period": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            json=test_budget,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "data" in data, "Response must contain 'data'"
        
        # Verify the budget was created with correct values
        budget = data["data"]
        assert budget.get("amount") == 500, f"Expected amount=500, got {budget.get('amount')}"
        assert budget.get("period") == "monthly", f"Expected period=monthly, got {budget.get('period')}"
        
        print(f"PASS: POST /api/budgets with category field succeeds, budget ID: {budget.get('_id')}")
        
        # Cleanup - delete the test budget
        if budget.get("_id"):
            requests.delete(f"{BASE_URL}/api/budgets/{budget['_id']}", headers=auth_headers)

    def test_create_budget_marketing_500_monthly(self, auth_headers):
        """Specific test: Create budget with category=Marketing, amount=500, period=monthly"""
        test_budget = {
            "category": "Marketing",
            "amount": 500,
            "period": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budgets",
            json=test_budget,
            headers=auth_headers
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        budget = data["data"]
        assert budget.get("amount") == 500
        assert budget.get("period") == "monthly"
        # The 'name' field should be set from 'category'
        assert budget.get("name") == "Marketing" or budget.get("category") == "Marketing"
        
        print("PASS: POST /api/budgets with category=Marketing, amount=500, period=monthly succeeds")
        
        # Store budget ID for cleanup
        return budget.get("_id")


class TestBudgetRetrieval:
    """Tests for GET /api/budgets to verify AI-created budgets appear"""

    def test_get_budgets_returns_list(self, auth_headers):
        """GET /api/budgets returns a list of budgets"""
        response = requests.get(
            f"{BASE_URL}/api/budgets",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert "data" in data, "Response must contain 'data'"
        assert isinstance(data["data"], list), "data must be a list"
        
        print(f"PASS: GET /api/budgets returns {len(data['data'])} budgets")

    def test_budgets_have_category_and_amount(self, auth_headers):
        """Each budget in list has category/name and amount fields"""
        response = requests.get(
            f"{BASE_URL}/api/budgets",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("data") and len(data["data"]) > 0:
            budget = data["data"][0]
            # Budget should have either 'name' or 'category' field
            has_name = "name" in budget or "category" in budget
            assert has_name, "Budget must have 'name' or 'category' field"
            assert "amount" in budget, "Budget must have 'amount' field"
            print(f"PASS: Budgets have required fields (name/category, amount)")
        else:
            print("SKIP: No budgets to validate")


class TestEndToEndFlow:
    """End-to-end test: Generate goals+budgets from insights, then verify budgets exist"""

    def test_full_flow_generate_and_verify_budgets(self, auth_headers):
        """Full flow: Generate goals+budgets, create budgets via API, verify they exist"""
        # Step 1: Generate goals and budgets from insights
        test_insights = [
            {"type": "spending", "title": "Software Costs", "content": "Optimize software subscriptions", "priority": "medium"}
        ]
        test_summary = {"total_income": 20000, "total_expense": 15000, "net_profit": 5000, "profit_margin": 25.0}

        gen_response = requests.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": test_insights, "summary": test_summary},
            headers=auth_headers,
            timeout=30
        )
        
        assert gen_response.status_code == 200
        gen_data = gen_response.json()
        assert gen_data.get("success") == True
        
        budgets_to_create = gen_data.get("budgets", [])
        created_budget_ids = []
        
        # Step 2: Create each budget via API (simulating frontend behavior)
        for budget in budgets_to_create[:2]:  # Limit to 2 for testing
            create_response = requests.post(
                f"{BASE_URL}/api/budgets",
                json={
                    "category": budget.get("category", "Other"),
                    "amount": budget.get("amount", 100),
                    "period": budget.get("period", "monthly")
                },
                headers=auth_headers
            )
            if create_response.status_code == 201:
                created_data = create_response.json()
                if created_data.get("data", {}).get("_id"):
                    created_budget_ids.append(created_data["data"]["_id"])
        
        # Step 3: Verify budgets exist in GET /api/budgets
        get_response = requests.get(f"{BASE_URL}/api/budgets", headers=auth_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        existing_ids = [b.get("_id") for b in get_data.get("data", [])]
        for bid in created_budget_ids:
            assert bid in existing_ids, f"Created budget {bid} not found in GET /api/budgets"
        
        print(f"PASS: Full flow - Generated {len(budgets_to_create)} budgets, created {len(created_budget_ids)}, verified in GET")
        
        # Cleanup
        for bid in created_budget_ids:
            requests.delete(f"{BASE_URL}/api/budgets/{bid}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
