const router = require('express').Router();
const { getNotifications, markAllRead, markRead } = require('../controllers/notificationsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.put('/mark-all-read', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);

module.exports = router;
