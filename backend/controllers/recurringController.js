const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');

// Helper to calculate next run date
const calculateNextRunDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
};

// @desc    Create recurring transaction
// @route   POST /api/recurring
// @access  Private
exports.createRecurring = async (req, res) => {
  try {
    const { type, category, amount, description, frequency, startDate, endDate, tags } = req.body;

    const nextRunDate = new Date(startDate);
    
    const recurring = await RecurringTransaction.create({
      user: req.user.id,
      type,
      category,
      amount,
      description,
      frequency: frequency || 'monthly',
      startDate,
      endDate: endDate || null,
      nextRunDate,
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      data: recurring
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all recurring transactions
// @route   GET /api/recurring
// @access  Private
exports.getRecurring = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.find({ user: req.user.id })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: recurring.length,
      data: recurring
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update recurring transaction
// @route   PUT /api/recurring/:id
// @access  Private
exports.updateRecurring = async (req, res) => {
  try {
    const { type, category, amount, description, frequency, startDate, endDate, isActive, tags } = req.body;

    let recurring = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!recurring) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    }

    recurring = await RecurringTransaction.findByIdAndUpdate(
      req.params.id,
      { type, category, amount, description, frequency, startDate, endDate, isActive, tags },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: recurring });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete recurring transaction
// @route   DELETE /api/recurring/:id
// @access  Private
exports.deleteRecurring = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!recurring) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    }

    await recurring.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process due recurring transactions (called by cron or manually)
// @route   POST /api/recurring/process
// @access  Private
exports.processRecurring = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all due recurring transactions for this user
    const dueRecurring = await RecurringTransaction.find({
      user: req.user.id,
      isActive: true,
      nextRunDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });

    const createdTransactions = [];

    for (const recurring of dueRecurring) {
      // Create the transaction
      const transaction = await Transaction.create({
        user: recurring.user,
        date: recurring.nextRunDate,
        type: recurring.type,
        category: recurring.category,
        amount: recurring.amount,
        description: `[Recurring] ${recurring.description}`,
        tags: [...(recurring.tags || []), 'recurring']
      });

      createdTransactions.push(transaction);

      // Update the recurring transaction
      const nextDate = calculateNextRunDate(recurring.nextRunDate, recurring.frequency);
      
      // Check if we should deactivate (end date reached)
      const shouldDeactivate = recurring.endDate && nextDate > new Date(recurring.endDate);

      await RecurringTransaction.findByIdAndUpdate(recurring._id, {
        lastRunDate: recurring.nextRunDate,
        nextRunDate: nextDate,
        isActive: !shouldDeactivate
      });
    }

    res.status(200).json({
      success: true,
      message: `Processed ${createdTransactions.length} recurring transactions`,
      data: createdTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle recurring transaction active status
// @route   PUT /api/recurring/:id/toggle
// @access  Private
exports.toggleRecurring = async (req, res) => {
  try {
    let recurring = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!recurring) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    }

    recurring = await RecurringTransaction.findByIdAndUpdate(
      req.params.id,
      { isActive: !recurring.isActive },
      { new: true }
    );

    res.status(200).json({ success: true, data: recurring });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
