"""
FastAPI server with Stripe integration, AI insights, and Node.js proxy for ProfitPilot.
"""
import os
import httpx
import asyncio
import subprocess
import json
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId

# Load environment variables
load_dotenv()

# Import Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

# Import LLM integration for AI insights
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Node.js backend URL (runs on port 8002 internally)
NODE_BACKEND_URL = "http://127.0.0.1:8002"

# MongoDB connection
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/profitpilot")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database()
payment_transactions = db.payment_transactions
transactions_collection = db.transactions
ai_insights_collection = db.ai_insights

# API Keys
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Payment packages (server-side defined - never accept amounts from frontend)
PAYMENT_PACKAGES = {
    "starter": {"amount": 29.00, "name": "Starter Plan", "description": "Basic financial tracking"},
    "professional": {"amount": 79.00, "name": "Professional Plan", "description": "Advanced features + reports"},
    "enterprise": {"amount": 199.00, "name": "Enterprise Plan", "description": "Full suite + priority support"},
    "custom": {"amount": None, "name": "Custom Invoice", "description": "Client payment"}
}

# Global process reference
node_process = None

def start_node_backend():
    """Start the Node.js backend process"""
    global node_process
    if node_process is None or node_process.poll() is not None:
        env = os.environ.copy()
        env["PORT"] = "8002"
        env["MONGODB_URI"] = MONGO_URI
        env["JWT_SECRET"] = os.environ.get("JWT_SECRET", "profit_app_secure_jwt_secret_key_2025")
        env["JWT_EXPIRES_IN"] = os.environ.get("JWT_EXPIRES_IN", "7d")
        
        # Load .env file for Node.js
        dotenv_path = "/app/backend/.env"
        if os.path.exists(dotenv_path):
            with open(dotenv_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        if key != "PORT":
                            env[key] = value
        
        node_process = subprocess.Popen(
            ["node", "index.js"],
            cwd="/app/backend",
            env=env,
        )
        print(f"Started Node.js backend with PID: {node_process.pid}")
        return True
    return False

def stop_node_backend():
    """Stop the Node.js backend process"""
    global node_process
    if node_process and node_process.poll() is None:
        node_process.terminate()
        try:
            node_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            node_process.kill()
        print("Node.js backend stopped")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    start_node_backend()
    await asyncio.sleep(2)
    yield
    stop_node_backend()

app = FastAPI(title="ProfitPilot API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for payment endpoints
class CreateCheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    user_email: Optional[str] = None
    custom_amount: Optional[float] = None  # Only used for custom invoices by admin
    invoice_description: Optional[str] = None

class PaymentStatusRequest(BaseModel):
    session_id: str

# ============== Payment Endpoints ==============

@app.get("/api/payments/packages")
async def get_payment_packages():
    """Get available payment packages"""
    packages = []
    for pkg_id, pkg in PAYMENT_PACKAGES.items():
        if pkg["amount"] is not None:  # Exclude custom package from listing
            packages.append({
                "id": pkg_id,
                "name": pkg["name"],
                "amount": pkg["amount"],
                "description": pkg["description"]
            })
    return {"success": True, "packages": packages}

@app.post("/api/payments/checkout")
async def create_checkout_session(request: Request, checkout_request: CreateCheckoutRequest):
    """Create a Stripe checkout session"""
    package_id = checkout_request.package_id
    origin_url = checkout_request.origin_url
    
    # Validate package
    if package_id not in PAYMENT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    
    package = PAYMENT_PACKAGES[package_id]
    
    # Get amount - never from frontend (except admin custom invoices)
    if package_id == "custom":
        if checkout_request.custom_amount is None or checkout_request.custom_amount <= 0:
            raise HTTPException(status_code=400, detail="Custom amount required for custom invoices")
        amount = float(checkout_request.custom_amount)
    else:
        amount = float(package["amount"])
    
    # Build success and cancel URLs
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"
    
    # Metadata for tracking
    metadata = {
        "package_id": package_id,
        "package_name": package["name"],
        "user_email": checkout_request.user_email or "anonymous",
        "source": "profitpilot_web"
    }
    
    if checkout_request.invoice_description:
        metadata["description"] = checkout_request.invoice_description
    
    try:
        # Initialize Stripe checkout
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session request
        checkout_req = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        # Create session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Save transaction to database (PENDING status)
        transaction = {
            "session_id": session.session_id,
            "amount": amount,
            "currency": "usd",
            "package_id": package_id,
            "package_name": package["name"],
            "user_email": checkout_request.user_email,
            "metadata": metadata,
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        payment_transactions.insert_one(transaction)
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payments/status/{session_id}")
async def get_payment_status(request: Request, session_id: str):
    """Get payment status for a checkout session"""
    try:
        # Initialize Stripe checkout
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Get status from Stripe
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Find existing transaction
        transaction = payment_transactions.find_one({"session_id": session_id})
        
        # Update transaction status if found and not already processed
        if transaction:
            current_status = transaction.get("payment_status")
            new_status = status.payment_status
            
            # Only update if status changed and not already paid
            if current_status != "paid" and current_status != new_status:
                payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": new_status,
                            "status": status.status,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
        
        return {
            "success": True,
            "session_id": session_id,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert from cents
            "currency": status.currency
        }
        
    except Exception as e:
        print(f"Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on webhook event
        if webhook_response.session_id:
            payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "payment_status": webhook_response.payment_status,
                        "event_type": webhook_response.event_type,
                        "event_id": webhook_response.event_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return {"success": True}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/payments/history")
async def get_payment_history(email: Optional[str] = None):
    """Get payment history for a user"""
    query = {}
    if email:
        query["user_email"] = email
    
    transactions = list(payment_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(50))
    
    return {"success": True, "transactions": transactions}

# ============== AI Insights Endpoints ==============

class InsightRequest(BaseModel):
    user_id: str

@app.post("/api/ai/insights")
async def generate_ai_insights(request: Request):
    """Generate AI-powered financial insights based on user's transaction data"""
    try:
        # Get auth token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Decode token to get user ID (simplified - in production use proper JWT verification)
        import jwt
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET", ""), algorithms=["HS256"])
            user_id = payload.get("id")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        # Get user's financial data
        user_object_id = ObjectId(user_id)
        
        # Aggregate transaction data
        pipeline = [
            {"$match": {"user": user_object_id}},
            {"$group": {
                "_id": "$type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        
        stats = list(transactions_collection.aggregate(pipeline))
        total_income = next((s["total"] for s in stats if s["_id"] == "INCOME"), 0)
        total_expense = next((s["total"] for s in stats if s["_id"] == "EXPENSE"), 0)
        income_count = next((s["count"] for s in stats if s["_id"] == "INCOME"), 0)
        expense_count = next((s["count"] for s in stats if s["_id"] == "EXPENSE"), 0)
        
        # Get expense by category
        expense_pipeline = [
            {"$match": {"user": user_object_id, "type": "EXPENSE"}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
            {"$sort": {"total": -1}},
            {"$limit": 5}
        ]
        top_expenses = list(transactions_collection.aggregate(expense_pipeline))
        
        # Get income by category
        income_pipeline = [
            {"$match": {"user": user_object_id, "type": "INCOME"}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
            {"$sort": {"total": -1}},
            {"$limit": 5}
        ]
        top_income = list(transactions_collection.aggregate(income_pipeline))
        
        # Prepare financial summary for AI
        financial_summary = f"""
        Financial Summary:
        - Total Income: ${total_income:,.2f} ({income_count} transactions)
        - Total Expenses: ${total_expense:,.2f} ({expense_count} transactions)
        - Net Profit: ${total_income - total_expense:,.2f}
        - Profit Margin: {((total_income - total_expense) / total_income * 100) if total_income > 0 else 0:.1f}%
        
        Top Income Sources:
        {chr(10).join([f"- {i['_id']}: ${i['total']:,.2f}" for i in top_income]) or "No income recorded"}
        
        Top Expense Categories:
        {chr(10).join([f"- {e['_id']}: ${e['total']:,.2f}" for e in top_expenses]) or "No expenses recorded"}
        """
        
        # Generate AI insights
        if not EMERGENT_LLM_KEY:
            return {
                "success": True,
                "insights": [
                    {
                        "type": "summary",
                        "title": "Financial Overview",
                        "content": f"You have ${total_income:,.2f} in income and ${total_expense:,.2f} in expenses, resulting in a net profit of ${total_income - total_expense:,.2f}.",
                        "priority": "info"
                    }
                ],
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{user_id}-{datetime.now().strftime('%Y%m%d')}",
            system_message="""You are a professional financial advisor AI for ProfitPilot, a financial tracking app for solopreneurs and freelancers.
            
            Analyze the user's financial data and provide actionable insights. Be specific, practical, and encouraging.
            
            Return your response as a JSON array of insight objects with this structure:
            [
                {
                    "type": "spending" | "saving" | "income" | "warning" | "opportunity",
                    "title": "Short insight title",
                    "content": "Detailed insight content (2-3 sentences)",
                    "priority": "high" | "medium" | "low"
                }
            ]
            
            Provide 3-5 insights covering:
            1. Overall financial health assessment
            2. Spending patterns and potential savings
            3. Income diversification opportunities
            4. Tax planning suggestions
            5. Actionable next steps
            
            IMPORTANT: Return ONLY the JSON array, no additional text."""
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=f"Analyze this financial data and provide personalized insights:\n{financial_summary}")
        
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            # Clean response and parse JSON
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            insights = json.loads(clean_response)
        except:
            insights = [{
                "type": "summary",
                "title": "Financial Overview",
                "content": response[:500] if len(response) > 500 else response,
                "priority": "info"
            }]
        
        # Store insights
        ai_insights_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "insights": insights,
                    "financial_summary": {
                        "total_income": total_income,
                        "total_expense": total_expense,
                        "net_profit": total_income - total_expense
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "insights": insights,
            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "net_profit": total_income - total_expense,
                "profit_margin": ((total_income - total_expense) / total_income * 100) if total_income > 0 else 0
            },
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/insights/cached")
async def get_cached_insights(request: Request):
    """Get cached AI insights for the user"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        import jwt
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET", ""), algorithms=["HS256"])
            user_id = payload.get("id")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        cached = ai_insights_collection.find_one({"user_id": user_id}, {"_id": 0})
        
        if cached:
            return {"success": True, **cached}
        else:
            return {"success": True, "insights": [], "message": "No cached insights found"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/generate-goals")
async def generate_goals_from_insights(request: Request):
    """Use AI to generate actionable goals AND budget suggestions based on the user's financial insights"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Unauthorized")

        import jwt
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, os.environ.get("JWT_SECRET", ""), algorithms=["HS256"])
            user_id = payload.get("id")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")

        body = await request.json()
        insights = body.get("insights", [])
        summary = body.get("summary", {})

        if not insights:
            return {"success": False, "message": "No insights provided to generate goals from"}

        insights_text = "\n".join([f"- [{i.get('type','info')}] {i.get('title','')}: {i.get('content','')}" for i in insights])
        summary_text = ""
        if summary:
            summary_text = f"""
Financial Summary:
- Total Income: ${summary.get('total_income', 0):,.2f}
- Total Expenses: ${summary.get('total_expense', 0):,.2f}
- Net Profit: ${summary.get('net_profit', 0):,.2f}
- Profit Margin: {summary.get('profit_margin', 0):.1f}%
"""

        if not EMERGENT_LLM_KEY:
            fallback_goals = []
            fallback_budgets = []
            for i, insight in enumerate(insights[:3]):
                fallback_goals.append({
                    "title": f"Goal: {insight.get('title', 'Improve finances')}",
                    "description": insight.get("content", "Work on improving this area of your finances."),
                    "targetAmount": round(summary.get("total_income", 10000) * 0.1 * (i + 1), 0),
                    "currentAmount": 0,
                    "deadline": (datetime.now(timezone.utc) + timedelta(days=90 * (i + 1))).strftime("%Y-%m-%d"),
                    "category": "BUSINESS"
                })
                fallback_budgets.append({
                    "category": insight.get("title", "General"),
                    "amount": round(summary.get("total_expense", 1000) * 0.3, 0),
                    "period": "monthly",
                    "reason": insight.get("content", "")
                })
            return {"success": True, "goals": fallback_goals, "budgets": fallback_budgets}

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"goals-{user_id}-{datetime.now().strftime('%Y%m%d%H%M')}",
            system_message="""You are a financial goal-setting and budgeting expert for ProfitPilot. Based on the AI insights and financial data provided, create specific goals AND budget recommendations.

Return a JSON object with two arrays:
{
    "goals": [
        {
            "title": "Short goal title (max 60 chars)",
            "description": "Why this goal matters and how to achieve it (2-3 sentences)",
            "targetAmount": 5000,
            "currentAmount": 0,
            "deadline": "2026-06-30",
            "category": "SAVINGS" or "BUSINESS" or "PERSONAL" or "RETIREMENT" or "EDUCATION" or "OTHER"
        }
    ],
    "budgets": [
        {
            "category": "Marketing" or "Software" or "Office Supplies" or "Travel" or "Meals" or "Professional Services" or "Equipment" or "Utilities" or "Rent" or "Other",
            "amount": 500,
            "period": "monthly",
            "reason": "Brief explanation for this budget limit (1 sentence)"
        }
    ]
}

Rules:
- Create 3-5 goals directly tied to the insights (SMART goals)
- Create 3-5 budget suggestions for expense categories based on spending patterns
- Set realistic amounts based on the financial data
- Goal deadlines should be 1-6 months from now (current date: """ + datetime.now().strftime("%Y-%m-%d") + """)
- Budget amounts should be reasonable limits based on current spending
- IMPORTANT: Return ONLY the JSON object, no additional text"""
        ).with_model("openai", "gpt-4o")

        user_message = UserMessage(text=f"Create actionable financial goals AND budget suggestions based on these insights:\n\n{summary_text}\n\nInsights:\n{insights_text}")

        response = await chat.send_message(user_message)

        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            parsed = json.loads(clean_response)
            if isinstance(parsed, list):
                goals = parsed
                budgets = []
            else:
                goals = parsed.get("goals", [])
                budgets = parsed.get("budgets", [])
        except:
            goals = [{
                "title": "Improve Financial Health",
                "description": response[:300] if len(response) > 300 else response,
                "targetAmount": round(summary.get("total_income", 10000) * 0.1, 0),
                "currentAmount": 0,
                "deadline": (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d"),
                "category": "BUSINESS"
            }]
            budgets = []

        return {"success": True, "goals": goals, "budgets": budgets}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Root and Health Endpoints ==============

@app.get("/")
async def root():
    return {"message": "ProfitPilot API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ============== Exchange Rate Endpoints ==============

exchange_rate_cache = {"rates": {}, "base": "USD", "updated_at": None}

async def fetch_exchange_rates():
    """Fetch and cache exchange rates from frankfurter.app (free, no key required)"""
    global exchange_rate_cache
    now = datetime.now(timezone.utc)
    # Cache for 1 hour
    if exchange_rate_cache["updated_at"] and (now - exchange_rate_cache["updated_at"]).total_seconds() < 3600:
        return exchange_rate_cache["rates"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://api.frankfurter.app/latest?from=USD")
            if resp.status_code == 200:
                data = resp.json()
                rates = data.get("rates", {})
                rates["USD"] = 1.0
                exchange_rate_cache = {"rates": rates, "base": "USD", "updated_at": now}
                return rates
    except Exception as e:
        print(f"Exchange rate fetch error: {e}")
    # Return cached or default rates
    if exchange_rate_cache["rates"]:
        return exchange_rate_cache["rates"]
    return {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.5, "CAD": 1.36, "AUD": 1.53, "INR": 83.1, "AED": 3.67, "SGD": 1.34, "CHF": 0.88}

@app.get("/api/exchange-rates")
async def get_exchange_rates():
    """Get current exchange rates (base: USD)"""
    rates = await fetch_exchange_rates()
    return {"success": True, "base": "USD", "rates": rates, "updated_at": exchange_rate_cache.get("updated_at", datetime.now(timezone.utc)).isoformat()}

@app.get("/api/exchange-rates/convert")
async def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "USD"):
    """Convert amount between currencies"""
    rates = await fetch_exchange_rates()
    from_rate = rates.get(from_currency, 1.0)
    to_rate = rates.get(to_currency, 1.0)
    usd_amount = amount / from_rate
    converted = usd_amount * to_rate
    return {"success": True, "original": amount, "from": from_currency, "to": to_currency, "converted": round(converted, 2), "rate": round(to_rate / from_rate, 6)}

# ============== Admin Endpoints ==============

users_collection = db.users
invoices_collection = db.invoices

def get_user_from_token(request: Request):
    """Extract user ID and role from JWT token"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    import jwt
    token = auth_header.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, os.environ.get("JWT_SECRET", ""), algorithms=["HS256"])
        return payload.get("id")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/admin/stats")
async def admin_stats(request: Request):
    """Get system-wide statistics (admin only)"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    total_users = users_collection.count_documents({})
    total_transactions = transactions_collection.count_documents({})
    total_invoices = invoices_collection.count_documents({})

    income_agg = list(transactions_collection.aggregate([{"$match": {"type": "INCOME"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]))
    expense_agg = list(transactions_collection.aggregate([{"$match": {"type": "EXPENSE"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]))
    total_income = income_agg[0]["total"] if income_agg else 0
    total_expenses = expense_agg[0]["total"] if expense_agg else 0

    recent_users = list(users_collection.find({}, {"_id": 0, "password": 0}).sort("createdAt", -1).limit(5))

    return {
        "success": True,
        "stats": {
            "totalUsers": total_users,
            "totalTransactions": total_transactions,
            "totalInvoices": total_invoices,
            "platformRevenue": total_income,
            "platformExpenses": total_expenses,
            "netProfit": total_income - total_expenses,
        },
        "recentUsers": recent_users,
    }

@app.get("/api/admin/users")
async def admin_list_users(request: Request):
    """List all users (admin only)"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = []
    for u in users_collection.find({}, {"password": 0}):
        user_txn_count = transactions_collection.count_documents({"user": u["_id"]})
        users.append({
            "id": str(u["_id"]),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "createdAt": u.get("createdAt", u.get("created_at", "")),
            "transactionCount": user_txn_count,
        })
    return {"success": True, "users": users}

@app.put("/api/admin/users/{target_user_id}/role")
async def admin_update_role(request: Request, target_user_id: str):
    """Update user role (admin only)"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    body = await request.json()
    new_role = body.get("role", "user")
    if new_role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    users_collection.update_one({"_id": ObjectId(target_user_id)}, {"$set": {"role": new_role}})
    return {"success": True, "message": f"User role updated to {new_role}"}

# ============== Email Notification Endpoints ==============

import resend

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

@app.get("/api/notifications/preferences")
async def get_notification_prefs(request: Request):
    """Get user notification preferences"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "preferences": 1})
    prefs = user.get("preferences", {}) if user else {}
    return {
        "success": True,
        "preferences": {
            "emailNotifications": prefs.get("emailNotifications", True),
            "weeklyReports": prefs.get("weeklyReports", True),
            "overdueReminders": prefs.get("overdueReminders", True),
            "transactionAlerts": prefs.get("transactionAlerts", False),
        }
    }

@app.put("/api/notifications/preferences")
async def update_notification_prefs(request: Request):
    """Update user notification preferences"""
    user_id = get_user_from_token(request)
    body = await request.json()
    prefs = body.get("preferences", {})
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "preferences.emailNotifications": prefs.get("emailNotifications", True),
            "preferences.weeklyReports": prefs.get("weeklyReports", True),
            "preferences.overdueReminders": prefs.get("overdueReminders", True),
            "preferences.transactionAlerts": prefs.get("transactionAlerts", False),
        }}
    )
    return {"success": True, "message": "Notification preferences updated"}

@app.post("/api/notifications/send-test")
async def send_test_email(request: Request):
    """Send a test email to the current user"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not RESEND_API_KEY:
        return {"success": False, "message": "Email service not configured. Set RESEND_API_KEY in .env"}

    user_email = user.get("email", "")
    user_name = user.get("name", "User")

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ProfitPilot</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Financial Intelligence Platform</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">Hi {user_name}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">Email notifications are working correctly. You'll receive updates about:</p>
            <ul style="color: #4b5563; line-height: 1.8;">
                <li>Transaction alerts for new income & expenses</li>
                <li>Weekly financial summary reports</li>
                <li>Overdue invoice reminders</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">You can manage your notification preferences in Settings.</p>
        </div>
    </div>
    """

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_email],
            "subject": "ProfitPilot - Email Notifications Active",
            "html": html,
        })
        return {"success": True, "message": f"Test email sent to {user_email}", "email_id": email_result.get("id") if isinstance(email_result, dict) else str(email_result)}
    except Exception as e:
        print(f"Email send error: {e}")
        return {"success": False, "message": f"Failed to send email: {str(e)}"}

@app.post("/api/notifications/invoice-reminder")
async def send_invoice_reminder(request: Request):
    """Send invoice overdue reminder email"""
    user_id = get_user_from_token(request)
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has notifications enabled
    prefs = user.get("preferences", {})
    if not prefs.get("overdueReminders", True):
        return {"success": False, "message": "Overdue reminders are disabled in your preferences"}

    if not RESEND_API_KEY:
        return {"success": False, "message": "Email service not configured"}

    body = await request.json()
    client_name = body.get("clientName", "Client")
    invoice_amount = body.get("amount", 0)
    due_date = body.get("dueDate", "N/A")

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Overdue Invoice Reminder</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="color: #111827;">An invoice is overdue and requires attention:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; color: #6b7280;">Client:</td><td style="padding: 8px; font-weight: bold;">{client_name}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">Amount:</td><td style="padding: 8px; font-weight: bold; color: #dc2626;">${invoice_amount:,.2f}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">Due Date:</td><td style="padding: 8px; font-weight: bold;">{due_date}</td></tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">Log into ProfitPilot to follow up on this invoice.</p>
        </div>
    </div>
    """

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user.get("email", "")],
            "subject": f"ProfitPilot - Overdue Invoice: {client_name}",
            "html": html,
        })
        return {"success": True, "message": "Reminder sent", "email_id": email_result.get("id") if isinstance(email_result, dict) else str(email_result)}
    except Exception as e:
        return {"success": False, "message": f"Failed to send: {str(e)}"}

# ============== Proxy to Node.js Backend ==============

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    """Proxy all other /api/* requests to Node.js backend"""
    global node_process
    
    # Skip if it's a payment, AI, exchange, admin, or notification endpoint (already handled above)
    if path.startswith("payments/") or path.startswith("webhook/") or path.startswith("ai/") or path.startswith("exchange-rates") or path.startswith("admin/") or path.startswith("notifications/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Check if Node.js is running
    if node_process is None or node_process.poll() is not None:
        print("Node.js backend not running, starting...")
        start_node_backend()
        await asyncio.sleep(3)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{NODE_BACKEND_URL}/api/{path}"
        body = await request.body()
        
        headers = {}
        for key, value in request.headers.items():
            if key.lower() not in ("host", "connection", "transfer-encoding", "content-length"):
                headers[key] = value
        
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
            
            resp_headers = {}
            for key, value in response.headers.items():
                if key.lower() not in ("content-encoding", "transfer-encoding", "connection"):
                    resp_headers[key] = value
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=resp_headers,
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError as e:
            print(f"Connection error to Node.js backend: {e}")
            start_node_backend()
            return Response(
                content='{"success": false, "message": "Backend starting, please retry"}',
                status_code=503,
                media_type="application/json"
            )
        except Exception as e:
            print(f"Proxy error: {e}")
            return Response(
                content=f'{{"success": false, "message": "Server error: {str(e)}"}}',
                status_code=500,
                media_type="application/json"
            )
