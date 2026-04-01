const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createRecurring,
  getRecurring,
  updateRecurring,
  deleteRecurring,
  processRecurring,
  toggleRecurring
} = require('../controllers/recurringController');

router.use(protect);

router.route('/')
  .get(getRecurring)
  .post(createRecurring);

router.post('/process', processRecurring);

router.route('/:id')
  .put(updateRecurring)
  .delete(deleteRecurring);

router.put('/:id/toggle', toggleRecurring);

module.exports = router;
