const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification } = require('../utils/notifications');

// GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const { status } = req.query;
    const user = req.user;

    let query = `
      SELECT m.*,
        u.full_name as requested_by_name, u.avatar_url as requested_by_avatar,
        r.full_name as reviewed_by_name
      FROM meetings m
      LEFT JOIN users u ON m.requested_by = u.id
      LEFT JOIN users r ON m.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (user.access_level === 'user') {
      query += ` AND (m.requested_by = ? OR m.id IN (SELECT meeting_id FROM meeting_attendees WHERE user_id = ?))`;
      params.push(user.id, user.id);
    }

    if (status) { query += ' AND m.status = ?'; params.push(status); }

    query += ' ORDER BY m.meeting_date ASC, m.meeting_time ASC';
    const [meetings] = await pool.execute(query, params);

    for (const meeting of meetings) {
      const [attendees] = await pool.execute(
        `SELECT u.id, u.full_name, u.avatar_url, u.role FROM meeting_attendees ma
         JOIN users u ON ma.user_id = u.id WHERE ma.meeting_id = ?`,
        [meeting.id]
      );
      meeting.attendees = attendees;
    }

    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/meetings/:id
const getMeeting = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT m.*, u.full_name as requested_by_name, r.full_name as reviewed_by_name
       FROM meetings m
       LEFT JOIN users u ON m.requested_by = u.id
       LEFT JOIN users r ON m.reviewed_by = r.id
       WHERE m.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const meeting = rows[0];
    const [attendees] = await pool.execute(
      `SELECT u.id, u.full_name, u.avatar_url, u.role FROM meeting_attendees ma
       JOIN users u ON ma.user_id = u.id WHERE ma.meeting_id = ?`,
      [meeting.id]
    );
    meeting.attendees = attendees;

    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/meetings
const createMeeting = async (req, res) => {
  try {
    const { topic, meeting_date, meeting_time, priority, notes, attendee_ids } = req.body;
    if (!topic || !meeting_date || !meeting_time) {
      return res.status(400).json({ success: false, message: 'Topic, date and time are required' });
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO meetings (id, topic, meeting_date, meeting_time, priority, notes, requested_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, topic, meeting_date, meeting_time, priority || 'medium', notes || null, req.user.id]
    );

    if (attendee_ids && attendee_ids.length > 0) {
      for (const userId of attendee_ids) {
        await pool.execute(
          'INSERT IGNORE INTO meeting_attendees (id, meeting_id, user_id) VALUES (?, ?, ?)',
          [uuidv4(), id, userId]
        );
      }
    }

    // Notify admins
    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE access_level IN ('admin','super_admin') AND is_active = TRUE AND id != ?",
      [req.user.id]
    );
    for (const admin of admins) {
      await createNotification({
        userId: admin.id, title: 'Meeting Request',
        message: `${req.user.full_name} requested a meeting: "${topic}"`,
        type: 'meeting', referenceId: id
      });
    }

    res.status(201).json({ success: true, message: 'Meeting requested', data: { id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  try {
    const { topic, meeting_date, meeting_time, priority, notes } = req.body;
    const [rows] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const m = rows[0];
    if (m.requested_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.execute(
      'UPDATE meetings SET topic=?, meeting_date=?, meeting_time=?, priority=?, notes=?, updated_at=NOW() WHERE id=?',
      [topic || m.topic, meeting_date || m.meeting_date, meeting_time || m.meeting_time,
        priority || m.priority, notes ?? m.notes, req.params.id]
    );
    res.json({ success: true, message: 'Meeting updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/meetings/:id
const deleteMeeting = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    if (rows[0].requested_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.execute('DELETE FROM meetings WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/meetings/:id/review (admin)
const reviewMeeting = async (req, res) => {
  try {
    const { status, admin_comment } = req.body;
    if (!['approved', 'rejected', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [rows] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    await pool.execute(
      'UPDATE meetings SET status=?, admin_comment=?, reviewed_by=?, updated_at=NOW() WHERE id=?',
      [status, admin_comment || null, req.user.id, req.params.id]
    );

    const meeting = rows[0];
    const statusLabel = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Marked Done';
    await createNotification({
      userId: meeting.requested_by,
      title: `Meeting ${statusLabel}`,
      message: `Your meeting "${meeting.topic}" was ${status}`,
      type: 'meeting', referenceId: meeting.id
    });

    res.json({ success: true, message: `Meeting ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting, reviewMeeting };
