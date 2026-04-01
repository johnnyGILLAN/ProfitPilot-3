const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  }
});

const InvoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  clientEmail: {
    type: String,
    required: [true, 'Please add a client email']
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Please add an invoice number']
  },
  date: {
    type: Date,
    required: [true, 'Please add an invoice date'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date']
  },
  items: [InvoiceItemSchema],
  amount: {
    type: Number,
    required: [true, 'Please add an amount']
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'PENDING'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);