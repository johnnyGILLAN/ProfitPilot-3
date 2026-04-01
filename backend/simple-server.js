const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server that mimics the API
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Parse the URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Log the request
  console.log(`${req.method} ${pathname}`);
  
  // Handle API routes
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    // Mock login endpoint
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        
        // Simple validation
        if (email && password) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            token: 'test-jwt-token',
            user: {
              email,
              name: 'John Doe',
              role: 'user'
            }
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Invalid email or password'
          }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid request body'
        }));
      }
    });
    return;
  }
  
  // Handle transactions endpoint
  if (pathname === '/api/transactions' && req.method === 'GET') {
    // Mock transactions data
    const transactions = [
      {
        _id: '1',
        date: '2023-05-01T00:00:00.000Z',
        type: 'INCOME',
        category: 'Salary',
        amount: 3000,
        description: 'Monthly salary',
        tags: ['regular', 'income']
      },
      {
        _id: '2',
        date: '2023-05-05T00:00:00.000Z',
        type: 'EXPENSE',
        category: 'Groceries',
        amount: 150.75,
        description: 'Weekly groceries',
        tags: ['food', 'regular']
      },
      {
        _id: '3',
        date: '2023-05-10T00:00:00.000Z',
        type: 'EXPENSE',
        category: 'Rent',
        amount: 1200,
        description: 'Monthly rent',
        tags: ['housing', 'regular']
      }
    ];
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: transactions.length,
      data: transactions
    }));
    return;
  }
  
  // Handle categories endpoint
  if (pathname === '/api/categories' && req.method === 'GET') {
    // Mock categories data
    const categories = [
      {
        _id: '1',
        name: 'Salary',
        type: 'INCOME',
        color: '#4CAF50'
      },
      {
        _id: '2',
        name: 'Groceries',
        type: 'EXPENSE',
        color: '#F44336'
      },
      {
        _id: '3',
        name: 'Rent',
        type: 'EXPENSE',
        color: '#2196F3'
      },
      {
        _id: '4',
        name: 'Utilities',
        type: 'EXPENSE',
        color: '#FF9800'
      },
      {
        _id: '5',
        name: 'Freelance',
        type: 'INCOME',
        color: '#9C27B0'
      }
    ];
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: categories.length,
      data: categories
    }));
    return;
  }
  
  // Default route
  if (pathname === '/' || pathname === '') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Profit App API</h1><p>Welcome to the Profit App API!</p>');
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    message: 'Route not found'
  }));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple API server running at http://localhost:${PORT}`);
  console.log(`Server is listening on all network interfaces (0.0.0.0:${PORT})`);
  
  // Create a log file to confirm the server started
  const logMessage = `Server started at ${new Date().toISOString()}\n`;
  fs.appendFileSync(path.join(__dirname, 'server-log.txt'), logMessage);
});