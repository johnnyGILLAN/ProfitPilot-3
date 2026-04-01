"""
FastAPI proxy server that forwards requests to the Node.js Express backend.
"""
import os
import httpx
import asyncio
import subprocess
import signal
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Node.js backend URL (runs on port 8002 internally)
NODE_BACKEND_URL = "http://127.0.0.1:8002"

# Global process reference
node_process = None

def start_node_backend():
    """Start the Node.js backend process"""
    global node_process
    if node_process is None or node_process.poll() is not None:
        env = os.environ.copy()
        env["PORT"] = "8002"
        env["MONGODB_URI"] = os.environ.get("MONGODB_URI", "mongodb+srv://jagmasterworks:Harpiedoo-29@profitpilot.obsqbwa.mongodb.net/profit-app?retryWrites=true&w=majority&appName=ProfitPilot")
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
                        if key != "PORT":  # Don't override port
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
    # Startup
    start_node_backend()
    # Give Node.js time to start
    await asyncio.sleep(2)
    yield
    # Shutdown
    stop_node_backend()

app = FastAPI(title="ProfitPilot API Proxy", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "ProfitPilot API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    """Proxy all /api/* requests to Node.js backend"""
    global node_process
    
    # Check if Node.js is running
    if node_process is None or node_process.poll() is not None:
        print("Node.js backend not running, starting...")
        start_node_backend()
        await asyncio.sleep(3)  # Wait for it to start
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Build the target URL
        url = f"{NODE_BACKEND_URL}/api/{path}"
        
        # Get request body
        body = await request.body()
        
        # Get headers (excluding hop-by-hop headers)
        headers = {}
        for key, value in request.headers.items():
            if key.lower() not in ("host", "connection", "transfer-encoding", "content-length"):
                headers[key] = value
        
        try:
            # Make the proxied request
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=request.query_params,
            )
            
            # Build response headers (exclude hop-by-hop)
            resp_headers = {}
            for key, value in response.headers.items():
                if key.lower() not in ("content-encoding", "transfer-encoding", "connection"):
                    resp_headers[key] = value
            
            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=resp_headers,
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError as e:
            print(f"Connection error to Node.js backend: {e}")
            # Try to restart
            start_node_backend()
            return Response(
                content='{"success": false, "message": "Backend starting, please retry in a moment"}',
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
