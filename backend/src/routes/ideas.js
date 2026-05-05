const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getIdeas, getIdea, createIdea, updateIdea, deleteIdea, reviewIdea } = require('../controllers/ideasController');

router.get('/', authenticate, getIdeas);
router.get('/:id', authenticate, getIdea);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.put('/:id/review', authenticate, requireAdmin, reviewIdea);

module.exports = router;
