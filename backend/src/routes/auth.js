const router = require('express').Router();
const { login, getMe, forgotPassword, resetPassword, changePassword, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
