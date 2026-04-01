"""
FastAPI server with Stripe integration and Node.js proxy for ProfitPilot.
"""
import os
import httpx
import asyncio
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# Import Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

# Node.js backend URL (runs on port 8002 internally)
NODE_BACKEND_URL = "http://127.0.0.1:8002"

# MongoDB connection
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/profitpilot")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database()
payment_transactions = db.payment_transactions

# Stripe API key
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

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

# ============== Root and Health Endpoints ==============

@app.get("/")
async def root():
    return {"message": "ProfitPilot API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ============== Proxy to Node.js Backend ==============

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    """Proxy all other /api/* requests to Node.js backend"""
    global node_process
    
    # Skip if it's a payment endpoint (already handled above)
    if path.startswith("payments/") or path.startswith("webhook/"):
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
