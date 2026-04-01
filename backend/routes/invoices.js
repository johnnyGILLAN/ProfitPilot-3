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
const { generateInvoicePDF } = require('../controllers/pdfController');

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
router.get('/:id/pdf', generateInvoicePDF);

module.exports = router;
