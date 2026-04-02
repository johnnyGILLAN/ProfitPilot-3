const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// @desc    Generate AI Insights based on transaction data
// @route   POST /api/ai/insights
// @access  Private
router.post('/insights', protect, async (req, res) => {
  try {
    // Get user's transactions for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      user: req.user.id,
      date: { $gte: sixMonthsAgo }
    }).sort('-date');

    // Calculate financial summary
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Analyze spending by category
    const expensesByCategory = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

    // Analyze income by category
    const incomeByCategory = {};
    transactions
      .filter(t => t.type === 'INCOME')
      .forEach(t => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      });

    // Generate insights based on the data
    const insights = [];

    // Income insights
    if (totalIncome > 0) {
      const topIncomeCategory = Object.entries(incomeByCategory)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topIncomeCategory) {
        insights.push({
          type: 'income',
          title: 'Top Income Source',
          content: `${topIncomeCategory[0]} is your strongest revenue stream, generating $${topIncomeCategory[1].toLocaleString()} (${((topIncomeCategory[1] / totalIncome) * 100).toFixed(1)}% of total income).`,
          priority: 'info'
        });
      }
    }

    // Spending insights
    if (totalExpense > 0) {
      const topExpenseCategory = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topExpenseCategory) {
        const percentage = ((topExpenseCategory[1] / totalExpense) * 100).toFixed(1);
        insights.push({
          type: 'spending',
          title: 'Highest Expense Category',
          content: `${topExpenseCategory[0]} accounts for $${topExpenseCategory[1].toLocaleString()} (${percentage}% of total expenses). ${percentage > 30 ? 'Consider reviewing this category for cost optimization.' : ''}`,
          priority: percentage > 30 ? 'medium' : 'low'
        });
      }
    }

    // Profit margin insight
    if (profitMargin < 20 && totalIncome > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Profit Margin Alert',
        content: `Your profit margin is ${profitMargin.toFixed(1)}%, which is below the recommended 20% threshold. Focus on increasing revenue or reducing expenses.`,
        priority: 'high'
      });
    } else if (profitMargin >= 30) {
      insights.push({
        type: 'saving',
        title: 'Strong Profit Margin',
        content: `Excellent! Your ${profitMargin.toFixed(1)}% profit margin indicates healthy financial management. Consider investing surplus funds.`,
        priority: 'info'
      });
    }

    // Savings opportunity
    const avgMonthlyExpense = totalExpense / 6;
    if (avgMonthlyExpense > 0) {
      const savingsTarget = avgMonthlyExpense * 0.1;
      insights.push({
        type: 'opportunity',
        title: 'Savings Opportunity',
        content: `By reducing monthly expenses by just 10%, you could save $${savingsTarget.toLocaleString()} per month or $${(savingsTarget * 12).toLocaleString()} annually.`,
        priority: 'medium'
      });
    }

    // Income diversification
    const incomeSourceCount = Object.keys(incomeByCategory).length;
    if (incomeSourceCount === 1 && totalIncome > 0) {
      insights.push({
        type: 'warning',
        title: 'Income Concentration Risk',
        content: 'Your income comes from a single source. Consider diversifying to reduce financial risk.',
        priority: 'medium'
      });
    } else if (incomeSourceCount >= 3) {
      insights.push({
        type: 'income',
        title: 'Diversified Income',
        content: `Great job! You have ${incomeSourceCount} different income sources, which provides financial stability.`,
        priority: 'info'
      });
    }

    // Monthly trend insight
    insights.push({
      type: 'summary',
      title: 'Financial Summary',
      content: `Over the past 6 months: Total Income: $${totalIncome.toLocaleString()}, Total Expenses: $${totalExpense.toLocaleString()}, Net Profit: $${netProfit.toLocaleString()}.`,
      priority: 'info'
    });

    res.json({
      success: true,
      insights,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: netProfit,
        profit_margin: profitMargin
      },
      categoryBreakdown: {
        expenses: expensesByCategory,
        income: incomeByCategory
      }
    });
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({
      success: false,
      message: `Error generating insights: ${error.message}`
    });
  }
});

// @desc    Generate Goals and Budgets based on AI analysis
// @route   POST /api/ai/generate-goals
// @access  Private
router.post('/generate-goals', protect, async (req, res) => {
  try {
    const { insights, summary } = req.body;

    // Get existing budgets to avoid duplicates
    const existingBudgets = await Budget.find({ user: req.user.id });
    const existingCategories = existingBudgets.map(b => b.name.toLowerCase());

    // Generate goals based on insights
    const goals = [];
    const budgets = [];

    const totalIncome = summary?.total_income || 0;
    const totalExpense = summary?.total_expense || 0;
    const netProfit = summary?.net_profit || 0;

    // Emergency fund goal
    if (totalExpense > 0) {
      const emergencyFundTarget = (totalExpense / 6) * 3; // 3 months of expenses
      goals.push({
        title: 'Emergency Fund',
        description: 'Build a 3-month emergency fund based on your average monthly expenses',
        targetAmount: Math.round(emergencyFundTarget),
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
        category: 'SAVINGS'
      });
    }

    // Business growth goal
    if (totalIncome > 0) {
      const growthTarget = totalIncome * 1.2; // 20% income growth
      goals.push({
        title: 'Revenue Growth Target',
        description: 'Increase annual revenue by 20% through new clients or services',
        targetAmount: Math.round(growthTarget),
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'BUSINESS'
      });
    }

    // Profit optimization goal
    if (netProfit > 0) {
      goals.push({
        title: 'Profit Optimization',
        description: 'Improve profit margin by optimizing expenses while maintaining revenue',
        targetAmount: Math.round(netProfit * 1.15), // 15% profit increase
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
        category: 'BUSINESS'
      });
    }

    // Generate budget suggestions based on expense categories
    const avgMonthlyExpense = totalExpense / 6;
    
    // Marketing budget (if not exists)
    if (!existingCategories.includes('marketing')) {
      budgets.push({
        category: 'Marketing',
        amount: Math.round(avgMonthlyExpense * 0.15), // 15% of expenses
        period: 'monthly',
        reason: 'Allocate budget for marketing to drive business growth'
      });
    }

    // Software/Tools budget
    if (!existingCategories.includes('software')) {
      budgets.push({
        category: 'Software',
        amount: Math.round(avgMonthlyExpense * 0.1), // 10% of expenses
        period: 'monthly',
        reason: 'Budget for productivity tools and software subscriptions'
      });
    }

    // Professional development
    if (!existingCategories.includes('education') && !existingCategories.includes('professional development')) {
      budgets.push({
        category: 'Professional Development',
        amount: Math.round(avgMonthlyExpense * 0.05), // 5% of expenses
        period: 'monthly',
        reason: 'Invest in skills and training for business growth'
      });
    }

    // Operating expenses budget
    budgets.push({
      category: 'Operating Expenses',
      amount: Math.round(avgMonthlyExpense * 0.7), // 70% of current expenses
      period: 'monthly',
      reason: 'Set a cap on general operating expenses to improve profitability'
    });

    res.json({
      success: true,
      goals,
      budgets,
      message: `Generated ${goals.length} goals and ${budgets.length} budget suggestions`
    });
  } catch (error) {
    console.error('Generate goals error:', error);
    res.status(500).json({
      success: false,
      message: `Error generating goals: ${error.message}`
    });
  }
});

// @desc    Save AI-generated goals to database
// @route   POST /api/ai/save-goals
// @access  Private
router.post('/save-goals', protect, async (req, res) => {
  try {
    const { goals } = req.body;
    
    // For now, goals are saved to localStorage on frontend
    // This endpoint can be used if we want to save to a Goals collection in MongoDB
    
    res.json({
      success: true,
      message: `${goals.length} goals ready to be saved`,
      goals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error saving goals: ${error.message}`
    });
  }
});

// @desc    Save AI-generated budgets to database
// @route   POST /api/ai/save-budgets
// @access  Private
router.post('/save-budgets', protect, async (req, res) => {
  try {
    const { budgets } = req.body;
    
    const budgetsToInsert = budgets.map(budget => ({
      user: req.user.id,
      name: budget.category,
      amount: budget.amount,
      period: budget.period,
      startDate: new Date(),
      notes: budget.reason
    }));

    const insertedBudgets = await Budget.insertMany(budgetsToInsert);

    res.json({
      success: true,
      count: insertedBudgets.length,
      message: `${insertedBudgets.length} budgets saved successfully`,
      budgets: insertedBudgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error saving budgets: ${error.message}`
    });
  }
});

module.exports = router;
