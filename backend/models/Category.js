const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    trim: true
  },
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE', 'BOTH'],
    default: 'BOTH'
  },
  color: {
    type: String,
    default: '#000000'
  },
  icon: {
    type: String,
    default: 'tag'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  budget: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique categories per user
categorySchema.index({ user: 1, name: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;