const router = require('express').Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, adminResetPassword } = require('../controllers/usersController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUser);
router.post('/', authenticate, requireSuperAdmin, createUser);
router.put('/:id', authenticate, requireSuperAdmin, updateUser);
router.delete('/:id', authenticate, requireSuperAdmin, deleteUser);
router.post('/:id/reset-password', authenticate, requireSuperAdmin, adminResetPassword);

module.exports = router;
