const mongoose = require('mongoose');

const SyncHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSource'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'error', 'partial'],
    required: true
  },
  recordsProcessed: {
    type: Number,
    default: 0
  },
  recordsCreated: {
    type: Number,
    default: 0
  },
  recordsUpdated: {
    type: Number,
    default: 0
  },
  recordsSkipped: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String
  },
  details: {
    type: String
  }
});

module.exports = mongoose.model('SyncHistory', SyncHistorySchema);