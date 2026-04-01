const express = require('express');
const router = express.Router();
const { 
  importTransactions,
  exportTransactions,
  importSheet,
  getImportTemplates
} = require('../controllers/importExportController');
const { protect } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes are protected
router.use(protect);

// Legacy routes
router.post('/import', upload.single('file'), importTransactions);
router.get('/export', exportTransactions);

// New enhanced routes
router.post('/import/sheet', upload.single('file'), importSheet);
router.get('/import/templates', getImportTemplates);

module.exports = router;