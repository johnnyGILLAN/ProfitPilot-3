const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const { date, type, category, amount, description, tags, receiptImage, isRecurring, recurringDetails } = req.body;

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      date,
      type,
      category,
      amount,
      description,
      tags,
      receiptImage,
      isRecurring,
      recurringDetails
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, category, minAmount, maxAmount, tags, sort = '-date' } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    // Add filters if provided
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    if (type) query.type = type;
    if (category) query.category = category;
    
    if (minAmount && maxAmount) {
      query.amount = { $gte: parseFloat(minAmount), $lte: parseFloat(maxAmount) };
    } else if (minAmount) {
      query.amount = { $gte: parseFloat(minAmount) };
    } else if (maxAmount) {
      query.amount = { $lte: parseFloat(maxAmount) };
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    // Execute query
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    const { date, type, category, amount, description, tags, receiptImage, isRecurring, recurringDetails } = req.body;
    
    let transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Update fields
    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        date,
        type,
        category,
        amount,
        description,
        tags,
        receiptImage,
        isRecurring,
        recurringDetails,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    await transaction.deleteOne();
    
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

// @desc    Bulk import transactions
// @route   POST /api/transactions/bulk
// @access  Private
exports.bulkImportTransactions = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No transactions provided for import'
      });
    }

    // Prepare transactions with user ID
    const transactionsToInsert = transactions.map(transaction => ({
      ...transaction,
      user: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all transactions
    const result = await Transaction.insertMany(transactionsToInsert, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      count: result.length,
      message: `Successfully imported ${result.length} transactions`
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error importing transactions'
    });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date range query
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.$gte = new Date(startDate);
      dateQuery.$lte = new Date(endDate);
    } else if (startDate) {
      dateQuery.$gte = new Date(startDate);
    } else if (endDate) {
      dateQuery.$lte = new Date(endDate);
    }
    
    // Base query with user - use ObjectId for aggregation
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const query = { user: userId };
    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }
    
    // Get total income
    const incomeResult = await Transaction.aggregate([
      { $match: { ...query, type: 'INCOME' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get total expenses
    const expenseResult = await Transaction.aggregate([
      { $match: { ...query, type: 'EXPENSE' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get category breakdown for expenses
    const expenseByCategory = await Transaction.aggregate([
      { $match: { ...query, type: 'EXPENSE' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    // Get category breakdown for income
    const incomeByCategory = await Transaction.aggregate([
      { $match: { ...query, type: 'INCOME' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    // Get monthly breakdown
    const monthlyBreakdown = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format monthly data
    const monthlyData = {};
    monthlyBreakdown.forEach(item => {
      const yearMonth = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { income: 0, expense: 0 };
      }
      
      if (item._id.type === 'INCOME') {
        monthlyData[yearMonth].income = item.total;
      } else {
        monthlyData[yearMonth].expense = item.total;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalIncome: incomeResult.length > 0 ? incomeResult[0].total : 0,
        totalExpense: expenseResult.length > 0 ? expenseResult[0].total : 0,
        balance: (incomeResult.length > 0 ? incomeResult[0].total : 0) - 
                 (expenseResult.length > 0 ? expenseResult[0].total : 0),
        expenseByCategory,
        incomeByCategory,
        monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense,
          balance: data.income - data.expense
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};