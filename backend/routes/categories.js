const express = require('express');
const router = express.Router();
const { 
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  createDefaultCategories
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createCategory)
  .get(getCategories);

router.route('/create-defaults')
  .post(createDefaultCategories);

router.route('/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

module.exports = router;