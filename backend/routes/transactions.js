const express = require('express');
const router = express.Router();
const { 
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  bulkImportTransactions
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createTransaction)
  .get(getTransactions);

router.route('/stats')
  .get(getTransactionStats);

router.route('/bulk')
  .post(bulkImportTransactions);

router.route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;