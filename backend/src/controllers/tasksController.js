const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/email');

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const user = req.user;
    let p = 0;
    const params = [];

    let query = `
      SELECT t.*,
        u.full_name as created_by_name, u.avatar_url as created_by_avatar,
        (SELECT COUNT(*)::int FROM task_comments tc WHERE tc.task_id = t.id) as comment_count,
        (SELECT COUNT(*)::int FROM task_files tf WHERE tf.task_id = t.id) as file_count,
        (SELECT COUNT(*)::int FROM task_checklist tck WHERE tck.task_id = t.id) as checklist_total,
        (SELECT COUNT(*)::int FROM task_checklist tck WHERE tck.task_id = t.id AND tck.is_completed = TRUE) as checklist_done
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;

    if (user.access_level === 'user') {
      const p1 = ++p, p2 = ++p;
      query += ` AND (t.id IN (SELECT task_id FROM task_assignments WHERE user_id = $${p1}) OR t.created_by = $${p2})`;
      params.push(user.id, user.id);
    }

    if (status) { query += ` AND t.status = $${++p}`; params.push(status); }
    if (priority) { query += ` AND t.priority = $${++p}`; params.push(priority); }
    if (search) {
      const p1 = ++p, p2 = ++p;
      query += ` AND (t.title ILIKE $${p1} OR t.description ILIKE $${p2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.created_at DESC';
    const { rows: tasks } = await pool.query(query, params);

    for (const task of tasks) {
      const { rows: assignees } = await pool.query(
        `SELECT u.id, u.full_name, u.avatar_url, u.department, u.role
         FROM task_assignments ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = $1`,
        [task.id]
      );
      task.assignees = assignees;
      task.ventures = task.ventures || [];
      task.platforms = task.platforms || [];
    }

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/my-tasks
const getMyTasks = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.description, t.priority, t.status, t.deadline,
         tck.id as checklist_id, tck.item_name as checklist_item, tck.is_completed,
         u.full_name as assigned_by_name
       FROM task_checklist tck
       JOIN tasks t ON tck.task_id = t.id
       JOIN users u ON t.created_by = u.id
       WHERE tck.assigned_to = $1
       ORDER BY t.deadline ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name as created_by_name, u.avatar_url as created_by_avatar
       FROM tasks t LEFT JOIN users u ON t.created_by = u.id WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Task not found' });

    const task = rows[0];

    const [{ rows: assignees }, { rows: checklist }, { rows: files }, { rows: comments }] = await Promise.all([
      pool.query(
        `SELECT u.id, u.full_name, u.avatar_url, u.department, u.role FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = $1`,
        [task.id]
      ),
      pool.query(
        `SELECT tck.*, u.full_name as assigned_to_name FROM task_checklist tck LEFT JOIN users u ON tck.assigned_to = u.id WHERE tck.task_id = $1 ORDER BY tck.sort_order`,
        [task.id]
      ),
      pool.query(
        `SELECT tf.*, u.full_name as uploaded_by_name FROM task_files tf JOIN users u ON tf.uploaded_by = u.id WHERE tf.task_id = $1 ORDER BY tf.uploaded_at DESC`,
        [task.id]
      ),
      pool.query(
        `SELECT tc.*, u.full_name as user_name, u.avatar_url FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
        [task.id]
      ),
    ]);

    task.assignees = assignees;
    task.checklist = checklist;
    task.files = files;
    task.comments = comments;
    task.ventures = task.ventures || [];
    task.platforms = task.platforms || [];

    res.json({ success: true, data: task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, priority, deadline, content_box, assignee_ids, checklist, ventures, platforms } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });

    const taskId = uuidv4();
    await pool.query(
      `INSERT INTO tasks (id, title, description, priority, deadline, content_box, ventures, platforms, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        taskId, title, description || null, priority || 'medium', deadline || null,
        content_box || null,
        ventures?.length ? ventures : null,
        platforms?.length ? platforms : null,
        req.user.id
      ]
    );

    if (assignee_ids && assignee_ids.length > 0) {
      for (const userId of assignee_ids) {
        await pool.query(
          'INSERT INTO task_assignments (id, task_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO NOTHING',
          [uuidv4(), taskId, userId]
        );
      }

      const { rows: assigneeUsers } = await pool.query(
        'SELECT id, full_name, work_email FROM users WHERE id = ANY($1)',
        [assignee_ids]
      );

      for (const u of assigneeUsers) {
        await createNotification({ userId: u.id, title: 'New Task Assigned', message: `You've been assigned: ${title}`, type: 'task', referenceId: taskId });
        await sendEmail(u.work_email, emailTemplates.taskAssigned(u.full_name, title, deadline));
      }
    }

    if (checklist && checklist.length > 0) {
      for (let i = 0; i < checklist.length; i++) {
        const item = checklist[i];
        const checkId = uuidv4();
        await pool.query(
          'INSERT INTO task_checklist (id, task_id, item_name, assigned_to, sort_order) VALUES ($1, $2, $3, $4, $5)',
          [checkId, taskId, item.item_name, item.assigned_to || null, i]
        );

        if (item.assigned_to) {
          const { rows: cu } = await pool.query('SELECT full_name FROM users WHERE id = $1', [item.assigned_to]);
          if (cu.length) {
            await createNotification({ userId: item.assigned_to, title: 'Sub-task Assigned', message: `${item.item_name} — ${title}`, type: 'task', referenceId: taskId });
          }
        }
      }
    }

    res.status(201).json({ success: true, message: 'Task created successfully', data: { id: taskId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, deadline, content_box, ventures, platforms } = req.body;
    const { id } = req.params;

    const { rows: existing } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Task not found' });

    const t = existing[0];
    await pool.query(
      `UPDATE tasks SET title=$1, description=$2, priority=$3, status=$4, deadline=$5, content_box=$6, ventures=$7, platforms=$8, updated_at=NOW() WHERE id=$9`,
      [
        title || t.title,
        description !== undefined ? description : t.description,
        priority || t.priority,
        status || t.status,
        deadline !== undefined ? deadline : t.deadline,
        content_box !== undefined ? content_box : t.content_box,
        ventures !== undefined ? (ventures?.length ? ventures : null) : t.ventures,
        platforms !== undefined ? (platforms?.length ? platforms : null) : t.platforms,
        id
      ]
    );

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT id FROM tasks WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Task not found' });
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tasks/:id/comments
const addComment = async (req, res) => {
  try {
    const { comment_text } = req.body;
    if (!comment_text) return res.status(400).json({ success: false, message: 'Comment text required' });
    const id = uuidv4();
    await pool.query('INSERT INTO task_comments (id, task_id, user_id, comment_text) VALUES ($1, $2, $3, $4)', [id, req.params.id, req.user.id, comment_text]);
    res.status(201).json({ success: true, message: 'Comment added', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/tasks/:id/checklist/:checkId
const updateChecklist = async (req, res) => {
  try {
    const { is_completed } = req.body;
    await pool.query(
      'UPDATE task_checklist SET is_completed = $1, completed_at = $2 WHERE id = $3 AND task_id = $4',
      [is_completed, is_completed ? new Date() : null, req.params.checkId, req.params.id]
    );
    res.json({ success: true, message: 'Checklist updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/stats
const getTaskStats = async (req, res) => {
  try {
    const user = req.user;
    let baseQuery = 'FROM tasks t';
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user.access_level === 'user') {
      baseQuery += ' JOIN task_assignments ta ON t.id = ta.task_id';
      whereClause += ' AND ta.user_id = $1';
      params.push(user.id);
    }

    const statuses = ['new', 'todo', 'ongoing', 'in_review', 'in_revision', 'approved', 'posted'];
    const stats = {};

    for (const status of statuses) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int as count ${baseQuery} ${whereClause} AND t.status = $${params.length + 1}`,
        [...params, status]
      );
      stats[status] = rows[0].count;
    }

    const { rows: total } = await pool.query(`SELECT COUNT(*)::int as count ${baseQuery} ${whereClause}`, params);
    stats.total = total[0].count;

    const { rows: overdue } = await pool.query(
      `SELECT COUNT(*)::int as count ${baseQuery} ${whereClause} AND t.deadline < NOW() AND t.status NOT IN ('approved','posted')`,
      params
    );
    stats.overdue = overdue[0].count;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTasks, getMyTasks, getTask, createTask, updateTask, deleteTask, addComment, updateChecklist, getTaskStats };
