const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification, getAdminUsers } = require('../utils/notifications');
const { sendEmail, sendBulkEmail, emailTemplates } = require('../utils/email');

// GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const { status } = req.query;
    const user = req.user;
    let p = 0;
    const params = [];

    let query = `
      SELECT m.*,
        u.full_name as requested_by_name, u.avatar_url as requested_by_avatar,
        r.full_name as reviewed_by_name
      FROM meetings m
      LEFT JOIN users u ON m.requested_by = u.id
      LEFT JOIN users r ON m.reviewed_by = r.id
      WHERE 1=1
    `;

    if (user.access_level === 'user') {
      const p1 = ++p, p2 = ++p;
      query += ` AND (m.requested_by = $${p1} OR m.id IN (SELECT meeting_id FROM meeting_attendees WHERE user_id = $${p2}))`;
      params.push(user.id, user.id);
    }

    if (status) { query += ` AND m.status = $${++p}`; params.push(status); }

    query += ' ORDER BY m.meeting_date ASC, m.meeting_time ASC';
    const { rows: meetings } = await pool.query(query, params);

    for (const meeting of meetings) {
      const { rows: attendees } = await pool.query(
        `SELECT u.id, u.full_name, u.avatar_url, u.role FROM meeting_attendees ma
         JOIN users u ON ma.user_id = u.id WHERE ma.meeting_id = $1`,
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
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name as requested_by_name, r.full_name as reviewed_by_name
       FROM meetings m
       LEFT JOIN users u ON m.requested_by = u.id
       LEFT JOIN users r ON m.reviewed_by = r.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const meeting = rows[0];
    const { rows: attendees } = await pool.query(
      `SELECT u.id, u.full_name, u.avatar_url, u.role FROM meeting_attendees ma
       JOIN users u ON ma.user_id = u.id WHERE ma.meeting_id = $1`,
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
    await pool.query(
      'INSERT INTO meetings (id, topic, meeting_date, meeting_time, priority, notes, requested_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, topic, meeting_date, meeting_time, priority || 'medium', notes || null, req.user.id]
    );

    if (attendee_ids && attendee_ids.length > 0) {
      for (const userId of attendee_ids) {
        await pool.query(
          'INSERT INTO meeting_attendees (id, meeting_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (meeting_id, user_id) DO NOTHING',
          [uuidv4(), id, userId]
        );
      }
    }

    const admins = await getAdminUsers(req.user.id);
    for (const admin of admins) {
      await createNotification({ userId: admin.id, title: 'Meeting Request', message: `${req.user.full_name} requested a meeting: "${topic}"`, type: 'meeting', referenceId: id });
    }
    await sendBulkEmail(admins, (adminName) => emailTemplates.meetingRequested(adminName, req.user.full_name, topic, meeting_date, meeting_time, priority));

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
    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const m = rows[0];
    if (m.requested_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query(
      'UPDATE meetings SET topic=$1, meeting_date=$2, meeting_time=$3, priority=$4, notes=$5, updated_at=NOW() WHERE id=$6',
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
    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    if (rows[0].requested_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query('DELETE FROM meetings WHERE id = $1', [req.params.id]);
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

    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Meeting not found' });

    await pool.query(
      'UPDATE meetings SET status=$1, admin_comment=$2, reviewed_by=$3, updated_at=NOW() WHERE id=$4',
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

    const { rows: requesterRows } = await pool.query('SELECT full_name, work_email FROM users WHERE id = $1', [meeting.requested_by]);
    if (requesterRows.length) {
      await sendEmail(
        requesterRows[0].work_email,
        emailTemplates.meetingReviewed(requesterRows[0].full_name, meeting.topic, status, admin_comment, meeting.meeting_date, meeting.meeting_time)
      );
    }

    res.json({ success: true, message: `Meeting ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting, reviewMeeting };
