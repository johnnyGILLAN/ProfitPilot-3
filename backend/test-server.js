const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server is Running!</h1><p>This confirms that Node.js is working correctly.</p>');
});

const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Server is listening on all network interfaces (0.0.0.0:${PORT})`);
  
  // Create a log file to confirm the server started
  const logMessage = `Server started at ${new Date().toISOString()}\n`;
  fs.appendFileSync(path.join(__dirname, 'server-log.txt'), logMessage);
});