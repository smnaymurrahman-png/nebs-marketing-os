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

// Absolute upload path — consistent with index.js regardless of CWD
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
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
    await pool.query(
      'INSERT INTO task_files (id, task_id, file_name, file_url, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [fileId, req.params.id, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, req.user.id]
    );
    await pool.query("UPDATE tasks SET status = 'in_review', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.status(201).json({ success: true, data: { id: fileId, file_url: fileUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Submit a link (replaces file upload)
router.post('/:id/links', authenticate, async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!url?.trim()) return res.status(400).json({ success: false, message: 'Link URL is required' });
    const fileId = uuidv4();
    await pool.query(
      'INSERT INTO task_files (id, task_id, file_name, file_url, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [fileId, req.params.id, name?.trim() || url.trim(), url.trim(), 'link', 0, req.user.id]
    );
    await pool.query("UPDATE tasks SET status = 'in_review', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.status(201).json({ success: true, data: { id: fileId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit link' });
  }
});

// Add assignee (admin only)
router.post('/:id/assignees', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    await pool.query(
      'INSERT INTO task_assignments (id, task_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO NOTHING',
      [uuidv4(), req.params.id, user_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove assignee (admin only)
router.delete('/:id/assignees/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM task_assignments WHERE task_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a checklist item to an existing task
router.post('/:id/checklist', authenticate, async (req, res) => {
  try {
    const { item_name, assigned_to } = req.body;
    if (!item_name?.trim()) return res.status(400).json({ success: false, message: 'Item name is required' });
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM task_checklist WHERE task_id = $1',
      [req.params.id]
    );
    const checkId = uuidv4();
    await pool.query(
      'INSERT INTO task_checklist (id, task_id, item_name, assigned_to, sort_order) VALUES ($1, $2, $3, $4, $5)',
      [checkId, req.params.id, item_name.trim(), assigned_to || null, rows[0].next_order]
    );
    res.status(201).json({ success: true, data: { id: checkId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add checklist item' });
  }
});

// Review file (admin)
router.put('/:taskId/files/:fileId/review', authenticate, requireAdmin, async (req, res) => {
  try {
    const { review_status, review_comment } = req.body;
    await pool.query(
      'UPDATE task_files SET review_status = $1, review_comment = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4 AND task_id = $5',
      [review_status, review_comment || null, req.user.id, req.params.fileId, req.params.taskId]
    );

    const newStatus = review_status === 'accepted' ? 'approved' : 'in_revision';
    await pool.query("UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, req.params.taskId]);

    res.json({ success: true, message: `File ${review_status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
