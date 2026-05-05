const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting, reviewMeeting } = require('../controllers/meetingsController');

router.get('/', authenticate, getMeetings);
router.get('/:id', authenticate, getMeeting);
router.post('/', authenticate, createMeeting);
router.put('/:id', authenticate, updateMeeting);
router.delete('/:id', authenticate, deleteMeeting);
router.put('/:id/review', authenticate, requireAdmin, reviewMeeting);

module.exports = router;
