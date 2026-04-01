const express = require('express');
const router = express.Router();
const { 
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createBudget)
  .get(getBudgets);

router.route('/:id')
  .get(getBudget)
  .put(updateBudget)
  .delete(deleteBudget);

router.route('/:id/progress')
  .get(getBudgetProgress);

module.exports = router;