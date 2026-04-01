const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  markAsPaid
} = require('../controllers/invoiceController');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(deleteInvoice);

router.put('/:id/paid', markAsPaid);

module.exports = router;
