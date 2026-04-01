const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    const { name, category, amount, period, startDate, endDate, categories, notes } = req.body;

    const budget = await Budget.create({
      user: req.user.id,
      name: name || category || 'Untitled Budget',
      amount,
      period: period || 'monthly',
      startDate: startDate || new Date(),
      endDate,
      categories,
      notes
    });

    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all budgets for a user
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const { period, active } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    // Add period filter if provided
    if (period) {
      query.period = period;
    }
    
    // Add active filter if provided
    if (active === 'true') {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }
    
    // Execute query
    const budgets = await Budget.find(query)
      .sort('-startDate')
      .populate('categories.category', 'name type color icon');
    
    res.status(200).json({
      success: true,
      count: budgets.length,
      data: budgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
exports.getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('categories.category', 'name type color icon');
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    const { name, amount, period, startDate, endDate, categories, notes } = req.body;
    
    let budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    // Update budget
    budget = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        name,
        amount,
        period,
        startDate,
        endDate,
        categories,
        notes
      },
      { new: true, runValidators: true }
    ).populate('categories.category', 'name type color icon');
    
    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    await budget.deleteOne();
    
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

// @desc    Get budget progress
// @route   GET /api/budgets/:id/progress
// @access  Private
exports.getBudgetProgress = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('categories.category', 'name type color icon');
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }
    
    // Get transactions within budget period
    const transactions = await Transaction.find({
      user: req.user.id,
      type: 'EXPENSE',
      date: {
        $gte: budget.startDate,
        $lte: budget.endDate || new Date()
      }
    });
    
    // Calculate total spent
    const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Calculate category spending
    const categorySpending = {};
    transactions.forEach(transaction => {
      if (!categorySpending[transaction.category]) {
        categorySpending[transaction.category] = 0;
      }
      categorySpending[transaction.category] += transaction.amount;
    });
    
    // Calculate category progress
    const categoryProgress = budget.categories.map(cat => {
      const categoryId = cat.category._id.toString();
      const categoryName = cat.category.name;
      const budgetAmount = cat.amount;
      const spent = categorySpending[categoryName] || 0;
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      
      return {
        category: {
          _id: categoryId,
          name: categoryName,
          color: cat.category.color,
          icon: cat.category.icon
        },
        budgetAmount,
        spent,
        remaining,
        percentage: Math.min(percentage, 100) // Cap at 100%
      };
    });
    
    // Calculate overall progress
    const overallProgress = {
      budgetAmount: budget.amount,
      spent: totalSpent,
      remaining: budget.amount - totalSpent,
      percentage: (totalSpent / budget.amount) * 100
    };
    
    res.status(200).json({
      success: true,
      data: {
        budget: {
          _id: budget._id,
          name: budget.name,
          period: budget.period,
          startDate: budget.startDate,
          endDate: budget.endDate
        },
        overallProgress,
        categoryProgress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};