const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  exportTransactions,
  exportInvoices,
  exportClients,
  exportReport
} = require('../controllers/exportController');

router.use(protect);

router.get('/transactions', exportTransactions);
router.get('/invoices', exportInvoices);
router.get('/clients', exportClients);
router.get('/report', exportReport);

module.exports = router;
