const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

const routes = require('./routes/auth');
const profile = require('./routes/profile');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json()); // Optional, but can be used alongside body-parser if needed

// Routes
app.use('/auth', routes);

app.use('/profile', profile);

app.get('/', (req, res) => {
  res.send('Welcome to Node.js Starter API!');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
