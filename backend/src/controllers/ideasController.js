const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification } = require('../utils/notifications');

// GET /api/ideas
const getIdeas = async (req, res) => {
  try {
    const { status } = req.query;
    const user = req.user;

    let query = `
      SELECT i.*,
        u.full_name as submitted_by_name, u.avatar_url as submitted_by_avatar,
        r.full_name as reviewed_by_name
      FROM ideas i
      LEFT JOIN users u ON i.submitted_by = u.id
      LEFT JOIN users r ON i.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (user.access_level === 'user') {
      query += ' AND i.submitted_by = ?';
      params.push(user.id);
    }

    if (status) { query += ' AND i.status = ?'; params.push(status); }

    query += ' ORDER BY i.created_at DESC';
    const [ideas] = await pool.execute(query, params);
    res.json({ success: true, data: ideas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/ideas/:id
const getIdea = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.*, u.full_name as submitted_by_name, u.avatar_url as submitted_by_avatar,
         r.full_name as reviewed_by_name
       FROM ideas i
       LEFT JOIN users u ON i.submitted_by = u.id
       LEFT JOIN users r ON i.reviewed_by = r.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Idea not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/ideas
const createIdea = async (req, res) => {
  try {
    const { title, description, doc_url, image_url, reference_links } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO ideas (id, title, description, doc_url, image_url, reference_links, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, description || null, doc_url || null, image_url || null,
        reference_links ? JSON.stringify(reference_links) : null, req.user.id]
    );

    // Notify admins
    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE access_level IN ('admin','super_admin') AND is_active = TRUE AND id != ?",
      [req.user.id]
    );
    for (const admin of admins) {
      await createNotification({
        userId: admin.id, title: 'New Idea Submitted',
        message: `${req.user.full_name} submitted: "${title}"`, type: 'idea', referenceId: id
      });
    }

    res.status(201).json({ success: true, message: 'Idea submitted', data: { id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/ideas/:id
const updateIdea = async (req, res) => {
  try {
    const { title, description, doc_url, image_url, reference_links } = req.body;
    const [rows] = await pool.execute('SELECT * FROM ideas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Idea not found' });

    const idea = rows[0];
    if (idea.submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.execute(
      'UPDATE ideas SET title=?, description=?, doc_url=?, image_url=?, reference_links=?, updated_at=NOW() WHERE id=?',
      [title || idea.title, description ?? idea.description, doc_url ?? idea.doc_url,
        image_url ?? idea.image_url,
        reference_links !== undefined ? JSON.stringify(reference_links) : idea.reference_links,
        req.params.id]
    );
    res.json({ success: true, message: 'Idea updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/ideas/:id
const deleteIdea = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM ideas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Idea not found' });

    if (rows[0].submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.execute('DELETE FROM ideas WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Idea deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/ideas/:id/review (admin)
const reviewIdea = async (req, res) => {
  try {
    const { status, admin_comment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const [rows] = await pool.execute('SELECT * FROM ideas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Idea not found' });

    await pool.execute(
      'UPDATE ideas SET status=?, admin_comment=?, reviewed_by=?, reviewed_at=NOW(), updated_at=NOW() WHERE id=?',
      [status, admin_comment || null, req.user.id, req.params.id]
    );

    const idea = rows[0];
    await createNotification({
      userId: idea.submitted_by,
      title: `Idea ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your idea "${idea.title}" was ${status}${admin_comment ? ': ' + admin_comment : ''}`,
      type: 'idea', referenceId: idea.id
    });

    res.json({ success: true, message: `Idea ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getIdeas, getIdea, createIdea, updateIdea, deleteIdea, reviewIdea };
