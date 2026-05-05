const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const {
  getTasks, getMyTasks, getTask, createTask, updateTask, deleteTask,
  addComment, updateChecklist, getTaskStats
} = require('../controllers/tasksController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
  filename: (req, file, cb) => {
    const unique = uuidv4();
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|ppt|pptx|xls|xlsx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

router.get('/stats', authenticate, getTaskStats);
router.get('/my-tasks', authenticate, getMyTasks);
router.get('/', authenticate, getTasks);
router.get('/:id', authenticate, getTask);
router.post('/', authenticate, requireAdmin, createTask);
router.put('/:id', authenticate, updateTask);
router.delete('/:id', authenticate, requireAdmin, deleteTask);
router.post('/:id/comments', authenticate, addComment);
router.put('/:id/checklist/:checkId', authenticate, updateChecklist);

// File upload
router.post('/:id/files', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileId = uuidv4();
    const fileUrl = `/uploads/${req.file.filename}`;
    await pool.execute(
      'INSERT INTO task_files (id, task_id, file_name, file_url, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fileId, req.params.id, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, req.user.id]
    );
    // Move task to in_review when user submits
    await pool.execute("UPDATE tasks SET status = 'in_review', updated_at = NOW() WHERE id = ?", [req.params.id]);
    res.status(201).json({ success: true, data: { id: fileId, file_url: fileUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Review file (admin)
router.put('/:taskId/files/:fileId/review', authenticate, requireAdmin, async (req, res) => {
  try {
    const { review_status, review_comment } = req.body;
    await pool.execute(
      'UPDATE task_files SET review_status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND task_id = ?',
      [review_status, review_comment || null, req.user.id, req.params.fileId, req.params.taskId]
    );

    // Update task status based on review
    const newStatus = review_status === 'accepted' ? 'approved' : 'in_revision';
    await pool.execute("UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?", [newStatus, req.params.taskId]);

    res.json({ success: true, message: `File ${review_status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
