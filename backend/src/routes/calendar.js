const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getEvents, createEvent, deleteEvent } = require('../controllers/calendarController');

router.get('/', authenticate, getEvents);
router.post('/', authenticate, requireAdmin, createEvent);
router.delete('/:id', authenticate, requireAdmin, deleteEvent);

module.exports = router;
