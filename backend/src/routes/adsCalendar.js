const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getAdsCalendar, upsertAdsCalendar } = require('../controllers/calendarSheetsController');

router.get('/', authenticate, getAdsCalendar);
router.put('/', authenticate, upsertAdsCalendar);

module.exports = router;
