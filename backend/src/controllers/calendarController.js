const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// GET /api/calendar?month=YYYY-MM
const getEvents = async (req, res) => {
  try {
    const { month } = req.query;
    const user = req.user;

    // Manual calendar events
    let dateFilter = '';
    const params = [];
    let p = 0;

    if (month) {
      dateFilter = `AND TO_CHAR(ce.event_date, 'YYYY-MM') = $${++p}`;
      params.push(month);
    }

    const { rows: manualEvents } = await pool.query(
      `SELECT ce.*, u.full_name as created_by_name, 'manual' as source
       FROM calendar_events ce
       LEFT JOIN users u ON ce.created_by = u.id
       WHERE 1=1 ${dateFilter}
       ORDER BY ce.event_date ASC, ce.event_time ASC`,
      params
    );

    // Task deadlines
    let tp = 0;
    const taskParams = [];
    let taskDateFilter = '';
    if (month) {
      taskDateFilter = `AND TO_CHAR(deadline, 'YYYY-MM') = $${++tp}`;
      taskParams.push(month);
    }

    let taskQuery = `SELECT id, title, deadline as event_date, NULL as event_time, status, priority, ventures, platforms, 'task' as source FROM tasks WHERE deadline IS NOT NULL ${taskDateFilter}`;
    if (user.access_level === 'user') {
      taskQuery += ` AND (id IN (SELECT task_id FROM task_assignments WHERE user_id = $${++tp}) OR created_by = $${++tp})`;
      taskParams.push(user.id, user.id);
    }

    const { rows: taskEvents } = await pool.query(taskQuery, taskParams);
    for (const t of taskEvents) {
      t.ventures = t.ventures || [];
      t.platforms = t.platforms || [];
    }

    // Approved meetings
    let mp = 0;
    const meetingParams = [];
    let meetingDateFilter = '';
    if (month) {
      meetingDateFilter = `AND TO_CHAR(meeting_date, 'YYYY-MM') = $${++mp}`;
      meetingParams.push(month);
    }

    let meetingQuery = `SELECT id, topic as title, meeting_date as event_date, meeting_time as event_time, status, priority, 'meeting' as source FROM meetings WHERE status = 'approved' ${meetingDateFilter}`;
    if (user.access_level === 'user') {
      meetingQuery += ` AND (requested_by = $${++mp} OR id IN (SELECT meeting_id FROM meeting_attendees WHERE user_id = $${++mp}))`;
      meetingParams.push(user.id, user.id);
    }
    const { rows: meetingEvents } = await pool.query(meetingQuery, meetingParams);

    res.json({ success: true, data: { events: manualEvents, tasks: taskEvents, meetings: meetingEvents } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/calendar (admin only)
const createEvent = async (req, res) => {
  try {
    const { title, event_date, event_time, color, event_type } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ success: false, message: 'Title and date are required' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO calendar_events (id, title, event_type, event_date, event_time, color, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, event_type || 'manual', event_date, event_time || null, color || '#1A56DB', req.user.id]
    );

    res.status(201).json({ success: true, message: 'Event created', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/calendar/:id (admin only)
const deleteEvent = async (req, res) => {
  try {
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getEvents, createEvent, deleteEvent };
