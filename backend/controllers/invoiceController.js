const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const { clientEmail, invoiceNumber, date, dueDate, items, notes, status } = req.body;

    // Calculate total amount from items
    const amount = items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);

    const invoice = await Invoice.create({
      user: req.user.id,
      clientEmail,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      date: date || new Date(),
      dueDate,
      items,
      amount,
      notes,
      status: status || 'PENDING'
    });

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all invoices for a user
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { status, sort = '-date' } = req.query;
    
    const query = { user: req.user.id };
    if (status) query.status = status;
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    const invoices = await Invoice.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Invoice.countDocuments(query);
    
    // Calculate summary stats
    const allInvoices = await Invoice.find({ user: req.user.id });
    const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = allInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = allInvoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0);
    const overdueAmount = allInvoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0);
    
    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount
      },
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const { clientEmail, invoiceNumber, date, dueDate, items, notes, status } = req.body;
    
    let invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Calculate total amount from items if items are provided
    let amount = invoice.amount;
    if (items) {
      amount = items.reduce((total, item) => {
        return total + (item.quantity * item.unitPrice);
      }, 0);
    }
    
    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        clientEmail,
        invoiceNumber,
        date,
        dueDate,
        items,
        amount,
        notes,
        status
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    await invoice.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark invoice as paid
// @route   PUT /api/invoices/:id/paid
// @access  Private
exports.markAsPaid = async (req, res) => {
  try {
    let invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'PAID' },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
