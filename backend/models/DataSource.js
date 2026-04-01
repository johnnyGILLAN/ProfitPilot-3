const mongoose = require('mongoose');

const DataSourceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this data source'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['google_sheet', 'excel', 'csv'],
    default: 'google_sheet'
  },
  url: {
    type: String,
    trim: true
  },
  sheetId: {
    type: String,
    trim: true
  },
  sheetName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'error', 'pending', 'inactive'],
    default: 'active'
  },
  lastSynced: {
    type: Date
  },
  syncFrequency: {
    type: String,
    enum: ['manual', 'hourly', 'daily', 'weekly', 'monthly'],
    default: 'manual'
  },
  errorMessage: {
    type: String
  },
  columnMapping: {
    date: {
      type: String,
      default: 'A'
    },
    type: {
      type: String,
      default: 'B'
    },
    category: {
      type: String,
      default: 'C'
    },
    amount: {
      type: String,
      default: 'D'
    },
    description: {
      type: String,
      default: 'E'
    },
    tags: {
      type: String,
      default: 'F'
    },
    receiptImage: {
      type: String,
      default: 'G'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DataSource', DataSourceSchema);