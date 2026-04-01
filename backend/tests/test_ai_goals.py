"""
Backend tests for AI Generate Goals feature
Tests the POST /api/ai/generate-goals endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('NEXT_PUBLIC_API_BASE_URL', 'https://ai-insights-stage.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@profitpilot.com"
TEST_PASSWORD = "demo123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestGenerateGoalsEndpoint:
    """Tests for POST /api/ai/generate-goals endpoint"""

    def test_generate_goals_without_auth_returns_401(self, api_client):
        """Test that endpoint requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": []}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data or "message" in data
        print("PASS: Generate goals without auth returns 401")

    def test_generate_goals_without_insights_returns_error(self, authenticated_client):
        """Test that endpoint returns error when no insights provided"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": []}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "message" in data
        assert "No insights" in data["message"]
        print("PASS: Generate goals without insights returns success:false with message")

    def test_generate_goals_with_valid_insights(self, authenticated_client):
        """Test that endpoint generates goals from valid insights"""
        insights = [
            {
                "type": "spending",
                "title": "High Marketing Costs",
                "content": "Your marketing expenses are 30% of revenue. Consider optimizing ad spend.",
                "priority": "high"
            },
            {
                "type": "saving",
                "title": "Emergency Fund Needed",
                "content": "Build a 3-month emergency fund to protect against income fluctuations.",
                "priority": "medium"
            }
        ]
        summary = {
            "total_income": 50000,
            "total_expense": 35000,
            "net_profit": 15000,
            "profit_margin": 30
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": insights, "summary": summary},
            timeout=30  # AI calls may take longer
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "goals" in data
        assert isinstance(data["goals"], list)
        assert len(data["goals"]) > 0
        print(f"PASS: Generate goals returns {len(data['goals'])} goals")

    def test_generated_goals_have_required_fields(self, authenticated_client):
        """Test that generated goals have all required fields"""
        insights = [
            {
                "type": "income",
                "title": "Diversify Income",
                "content": "Consider adding passive income streams.",
                "priority": "medium"
            }
        ]
        summary = {
            "total_income": 30000,
            "total_expense": 20000,
            "net_profit": 10000,
            "profit_margin": 33.3
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/ai/generate-goals",
            json={"insights": insights, "summary": summary},
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Check each goal has required fields
        required_fields = ["title", "description", "targetAmount", "currentAmount", "deadline", "category"]
        for goal in data["goals"]:
            for field in required_fields:
                assert field in goal, f"Goal missing required field: {field}"
            
            # Validate field types
            assert isinstance(goal["title"], str)
            assert isinstance(goal["description"], str)
            assert isinstance(goal["targetAmount"], (int, float))
            assert isinstance(goal["currentAmount"], (int, float))
            assert isinstance(goal["deadline"], str)
            assert isinstance(goal["category"], str)
            
            # Validate deadline format (YYYY-MM-DD)
            assert len(goal["deadline"]) == 10
            assert goal["deadline"][4] == "-" and goal["deadline"][7] == "-"
        
        print("PASS: All generated goals have required fields with correct types")


class TestAIInsightsEndpoint:
    """Tests for AI insights endpoints (prerequisite for goals)"""

    def test_cached_insights_without_auth_returns_401(self, api_client):
        """Test that cached insights endpoint requires auth"""
        response = api_client.get(f"{BASE_URL}/api/ai/insights/cached")
        assert response.status_code == 401
        print("PASS: Cached insights without auth returns 401")

    def test_cached_insights_with_auth(self, authenticated_client):
        """Test that cached insights endpoint works with auth"""
        response = authenticated_client.get(f"{BASE_URL}/api/ai/insights/cached")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # May or may not have insights depending on previous usage
        assert "insights" in data or "message" in data
        print("PASS: Cached insights endpoint returns valid response")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
