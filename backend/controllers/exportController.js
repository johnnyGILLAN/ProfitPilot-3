const { Parser } = require('json2csv');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

// @desc    Export transactions to CSV
// @route   GET /api/export/transactions
// @access  Private
exports.exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const query = { user: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query).sort('-date').lean();
    
    const data = transactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type,
      Category: t.category,
      Amount: t.amount.toFixed(2),
      Description: t.description || '',
      Tags: (t.tags || []).join(', ')
    }));
    
    const parser = new Parser({
      fields: ['Date', 'Type', 'Category', 'Amount', 'Description', 'Tags']
    });
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export invoices to CSV
// @route   GET /api/export/invoices
// @access  Private
exports.exportInvoices = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { user: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const invoices = await Invoice.find(query).sort('-date').lean();
    
    const data = invoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Client Email': inv.clientEmail,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Due Date': new Date(inv.dueDate).toLocaleDateString(),
      'Amount': inv.amount.toFixed(2),
      'Status': inv.status,
      'Items': inv.items.map(i => `${i.description} (${i.quantity}x$${i.unitPrice})`).join('; ')
    }));
    
    const parser = new Parser({
      fields: ['Invoice Number', 'Client Email', 'Date', 'Due Date', 'Amount', 'Status', 'Items']
    });
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export clients to CSV
// @route   GET /api/export/clients
// @access  Private
exports.exportClients = async (req, res) => {
  try {
    const clients = await Client.find({ user: req.user.id }).sort('-createdAt').lean();
    
    const data = clients.map(c => ({
      'Name': c.name,
      'Email': c.email,
      'Phone': c.phone || '',
      'Company': c.company || '',
      'Address': c.address || '',
      'Notes': c.notes || ''
    }));
    
    const parser = new Parser({
      fields: ['Name', 'Email', 'Phone', 'Company', 'Address', 'Notes']
    });
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=clients-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export financial report to CSV
// @route   GET /api/export/report
// @access  Private
exports.exportReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const mongoose = require('mongoose');
    
    const query = { user: new mongoose.Types.ObjectId(req.user.id) };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Get aggregated data
    const incomeByCategory = await Transaction.aggregate([
      { $match: { ...query, type: 'INCOME' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    const expenseByCategory = await Transaction.aggregate([
      { $match: { ...query, type: 'EXPENSE' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    const totalIncome = incomeByCategory.reduce((sum, i) => sum + i.total, 0);
    const totalExpense = expenseByCategory.reduce((sum, e) => sum + e.total, 0);
    
    // Build report data
    const data = [
      { Category: 'SUMMARY', Type: '', Amount: '' },
      { Category: 'Total Income', Type: 'INCOME', Amount: totalIncome.toFixed(2) },
      { Category: 'Total Expenses', Type: 'EXPENSE', Amount: totalExpense.toFixed(2) },
      { Category: 'Net Profit', Type: 'PROFIT', Amount: (totalIncome - totalExpense).toFixed(2) },
      { Category: '', Type: '', Amount: '' },
      { Category: 'INCOME BREAKDOWN', Type: '', Amount: '' },
      ...incomeByCategory.map(i => ({ Category: i._id, Type: 'INCOME', Amount: i.total.toFixed(2) })),
      { Category: '', Type: '', Amount: '' },
      { Category: 'EXPENSE BREAKDOWN', Type: '', Amount: '' },
      ...expenseByCategory.map(e => ({ Category: e._id, Type: 'EXPENSE', Amount: e.total.toFixed(2) }))
    ];
    
    const parser = new Parser({ fields: ['Category', 'Type', 'Amount'] });
    const csv = parser.parse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financial-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
