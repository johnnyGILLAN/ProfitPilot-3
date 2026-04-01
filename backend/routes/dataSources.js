const express = require('express');
const router = express.Router();
const { 
  createDataSource,
  getDataSources,
  getDataSource,
  updateDataSource,
  deleteDataSource,
  syncDataSource,
  getSyncHistory,
  getAllSyncHistory
} = require('../controllers/dataSourceController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Data source routes
router.route('/')
  .post(createDataSource)
  .get(getDataSources);

router.route('/:id')
  .get(getDataSource)
  .put(updateDataSource)
  .delete(deleteDataSource);

router.route('/:id/sync')
  .post(syncDataSource);

router.route('/:id/history')
  .get(getSyncHistory);

// Sync history routes
router.route('/sync-history')
  .get(getAllSyncHistory);

module.exports = router;