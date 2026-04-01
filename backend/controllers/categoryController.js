const Category = require('../models/Category');

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    const { name, type, color, icon, budget } = req.body;

    // Check if category already exists for this user
    const existingCategory = await Category.findOne({
      user: req.user.id,
      name: name
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category
    const category = await Category.create({
      user: req.user.id,
      name,
      type,
      color,
      icon,
      budget
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all categories for a user
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    // Add type filter if provided
    if (type) {
      if (type === 'BOTH') {
        query.$or = [{ type: 'INCOME' }, { type: 'EXPENSE' }, { type: 'BOTH' }];
      } else {
        query.$or = [{ type }, { type: 'BOTH' }];
      }
    }
    
    // Execute query
    const categories = await Category.find(query).sort('name');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res) => {
  try {
    const { name, type, color, icon, budget } = req.body;
    
    let category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category is default and prevent modification
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default categories cannot be modified'
      });
    }
    
    // Check if new name already exists for another category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        user: req.user.id,
        name,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }
    
    // Update category
    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        color,
        icon,
        budget
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category is default
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default categories cannot be deleted'
      });
    }
    
    await category.deleteOne();
    
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

// @desc    Create default categories for a new user
// @route   POST /api/categories/create-defaults
// @access  Private
exports.createDefaultCategories = async (req, res) => {
  try {
    // Default income categories
    const defaultIncomeCategories = [
      { name: 'Salary', type: 'INCOME', color: '#4CAF50', icon: 'briefcase', isDefault: true },
      { name: 'Investments', type: 'INCOME', color: '#2196F3', icon: 'trending-up', isDefault: true },
      { name: 'Gifts', type: 'INCOME', color: '#9C27B0', icon: 'gift', isDefault: true },
      { name: 'Other Income', type: 'INCOME', color: '#607D8B', icon: 'plus-circle', isDefault: true }
    ];
    
    // Default expense categories
    const defaultExpenseCategories = [
      { name: 'Food & Dining', type: 'EXPENSE', color: '#FF5722', icon: 'coffee', isDefault: true },
      { name: 'Transportation', type: 'EXPENSE', color: '#3F51B5', icon: 'car', isDefault: true },
      { name: 'Housing', type: 'EXPENSE', color: '#795548', icon: 'home', isDefault: true },
      { name: 'Utilities', type: 'EXPENSE', color: '#009688', icon: 'zap', isDefault: true },
      { name: 'Entertainment', type: 'EXPENSE', color: '#E91E63', icon: 'film', isDefault: true },
      { name: 'Shopping', type: 'EXPENSE', color: '#FFC107', icon: 'shopping-bag', isDefault: true },
      { name: 'Health', type: 'EXPENSE', color: '#F44336', icon: 'activity', isDefault: true },
      { name: 'Education', type: 'EXPENSE', color: '#00BCD4', icon: 'book', isDefault: true },
      { name: 'Personal Care', type: 'EXPENSE', color: '#8BC34A', icon: 'user', isDefault: true },
      { name: 'Travel', type: 'EXPENSE', color: '#673AB7', icon: 'map', isDefault: true },
      { name: 'Miscellaneous', type: 'EXPENSE', color: '#9E9E9E', icon: 'grid', isDefault: true }
    ];
    
    // Combine all categories
    const allDefaultCategories = [...defaultIncomeCategories, ...defaultExpenseCategories];
    
    // Add user ID to each category
    const categoriesWithUser = allDefaultCategories.map(category => ({
      ...category,
      user: req.user.id
    }));
    
    // Insert all categories
    await Category.insertMany(categoriesWithUser);
    
    res.status(201).json({
      success: true,
      message: 'Default categories created successfully',
      count: categoriesWithUser.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};