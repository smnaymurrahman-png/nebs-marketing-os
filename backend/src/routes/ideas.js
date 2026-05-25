const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getIdeas, getIdea, createIdea, updateIdea, deleteIdea, reviewIdea } = require('../controllers/ideasController');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, `idea-${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed'));
  },
});

router.get('/', authenticate, getIdeas);
router.get('/:id', authenticate, getIdea);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.put('/:id/review', authenticate, requireAdmin, reviewIdea);

// Upload an ideation image — returns { url } usable as image_url
router.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
  res.status(201).json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
});

module.exports = router;
