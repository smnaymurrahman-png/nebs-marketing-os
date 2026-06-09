const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getContentCalendar, upsertContentCalendar } = require('../controllers/calendarSheetsController');

router.get('/', authenticate, getContentCalendar);
router.put('/', authenticate, upsertContentCalendar);

module.exports = router;
