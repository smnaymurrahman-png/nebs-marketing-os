const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification, createBulkNotifications } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/email');

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, assigned_to, search } = req.query;
    const user = req.user;

    let query = `
      SELECT t.*, 
        u.full_name as created_by_name, u.avatar_url as created_by_avatar,
        (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_files tf WHERE tf.task_id = t.id) as file_count,
        (SELECT COUNT(*) FROM task_checklist tck WHERE tck.task_id = t.id) as checklist_total,
        (SELECT COUNT(*) FROM task_checklist tck WHERE tck.task_id = t.id AND tck.is_completed = TRUE) as checklist_done
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Users see only tasks assigned to them (or tasks they created)
    if (user.access_level === 'user') {
      query += ` AND (t.id IN (SELECT task_id FROM task_assignments WHERE user_id = ?) OR t.created_by = ?)`;
      params.push(user.id, user.id);
    }

    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
    if (search) { query += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY t.created_at DESC';
    const [tasks] = await pool.execute(query, params);

    // Fetch assignees for each task
    for (const task of tasks) {
      const [assignees] = await pool.execute(
        `SELECT u.id, u.full_name, u.avatar_url, u.department, u.role
         FROM task_assignments ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = ?`,
        [task.id]
      );
      task.assignees = assignees;
      task.ventures = task.ventures ? JSON.parse(task.ventures) : [];
      task.platforms = task.platforms ? JSON.parse(task.platforms) : [];
    }

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/my-tasks — personal task view
const getMyTasks = async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      `SELECT t.id, t.title, t.description, t.priority, t.status, t.deadline,
         tck.id as checklist_id, tck.item_name as checklist_item, tck.is_completed,
         u.full_name as assigned_by_name
       FROM task_checklist tck
       JOIN tasks t ON tck.task_id = t.id
       JOIN users u ON t.created_by = u.id
       WHERE tck.assigned_to = ?
       ORDER BY t.deadline ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, u.full_name as created_by_name, u.avatar_url as created_by_avatar
       FROM tasks t LEFT JOIN users u ON t.created_by = u.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Task not found' });

    const task = rows[0];

    const [assignees] = await pool.execute(
      `SELECT u.id, u.full_name, u.avatar_url, u.department, u.role FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [task.id]
    );
    const [checklist] = await pool.execute(
      `SELECT tck.*, u.full_name as assigned_to_name FROM task_checklist tck LEFT JOIN users u ON tck.assigned_to = u.id WHERE tck.task_id = ? ORDER BY tck.sort_order`,
      [task.id]
    );
    const [files] = await pool.execute(
      `SELECT tf.*, u.full_name as uploaded_by_name FROM task_files tf JOIN users u ON tf.uploaded_by = u.id WHERE tf.task_id = ? ORDER BY tf.uploaded_at DESC`,
      [task.id]
    );
    const [comments] = await pool.execute(
      `SELECT tc.*, u.full_name as user_name, u.avatar_url FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at ASC`,
      [task.id]
    );

    task.assignees = assignees;
    task.checklist = checklist;
    task.files = files;
    task.comments = comments;
    task.ventures = task.ventures ? JSON.parse(task.ventures) : [];
    task.platforms = task.platforms ? JSON.parse(task.platforms) : [];

    res.json({ success: true, data: task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tasks — create task
const createTask = async (req, res) => {
  try {
    const { title, description, priority, deadline, content_box, assignee_ids, checklist, ventures, platforms } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });

    const taskId = uuidv4();
    await pool.execute(
      `INSERT INTO tasks (id, title, description, priority, deadline, content_box, ventures, platforms, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, title, description || null, priority || 'medium', deadline || null, content_box || null,
       ventures?.length ? JSON.stringify(ventures) : null,
       platforms?.length ? JSON.stringify(platforms) : null,
       req.user.id]
    );

    // Assign users
    if (assignee_ids && assignee_ids.length > 0) {
      for (const userId of assignee_ids) {
        await pool.execute(
          'INSERT IGNORE INTO task_assignments (id, task_id, user_id) VALUES (?, ?, ?)',
          [uuidv4(), taskId, userId]
        );
      }

      // Notify assignees
      const [assigneeUsers] = await pool.execute(
        `SELECT id, full_name, work_email FROM users WHERE id IN (${assignee_ids.map(() => '?').join(',')})`,
        assignee_ids
      );

      for (const u of assigneeUsers) {
        await createNotification({ userId: u.id, title: 'New Task Assigned', message: `You've been assigned: ${title}`, type: 'task', referenceId: taskId });
        await sendEmail(u.work_email, emailTemplates.taskAssigned(u.full_name, title, deadline));
      }
    }

    // Add checklist items
    if (checklist && checklist.length > 0) {
      for (let i = 0; i < checklist.length; i++) {
        const item = checklist[i];
        const checkId = uuidv4();
        await pool.execute(
          'INSERT INTO task_checklist (id, task_id, item_name, assigned_to, sort_order) VALUES (?, ?, ?, ?, ?)',
          [checkId, taskId, item.item_name, item.assigned_to || null, i]
        );

        // Notify checklist assignee
        if (item.assigned_to) {
          const [cu] = await pool.execute('SELECT full_name, work_email FROM users WHERE id = ?', [item.assigned_to]);
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

// PUT /api/tasks/:id — update task
const updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, deadline, content_box, ventures, platforms } = req.body;
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Task not found' });

    await pool.execute(
      `UPDATE tasks SET title=?, description=?, priority=?, status=?, deadline=?, content_box=?, ventures=?, platforms=?, updated_at=NOW() WHERE id=?`,
      [
        title || existing[0].title,
        description !== undefined ? description : existing[0].description,
        priority || existing[0].priority,
        status || existing[0].status,
        deadline !== undefined ? deadline : existing[0].deadline,
        content_box !== undefined ? content_box : existing[0].content_box,
        ventures !== undefined ? (ventures?.length ? JSON.stringify(ventures) : null) : existing[0].ventures,
        platforms !== undefined ? (platforms?.length ? JSON.stringify(platforms) : null) : existing[0].platforms,
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
    const [existing] = await pool.execute('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Task not found' });
    await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
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
    await pool.execute('INSERT INTO task_comments (id, task_id, user_id, comment_text) VALUES (?, ?, ?, ?)', [id, req.params.id, req.user.id, comment_text]);
    res.status(201).json({ success: true, message: 'Comment added', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/tasks/:id/checklist/:checkId
const updateChecklist = async (req, res) => {
  try {
    const { is_completed } = req.body;
    await pool.execute(
      'UPDATE task_checklist SET is_completed = ?, completed_at = ? WHERE id = ? AND task_id = ?',
      [is_completed, is_completed ? new Date() : null, req.params.checkId, req.params.id]
    );
    res.json({ success: true, message: 'Checklist updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/stats — dashboard stats
const getTaskStats = async (req, res) => {
  try {
    const user = req.user;
    let baseQuery = 'FROM tasks t';
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user.access_level === 'user') {
      baseQuery += ' JOIN task_assignments ta ON t.id = ta.task_id';
      whereClause += ' AND ta.user_id = ?';
      params.push(user.id);
    }

    const statuses = ['new', 'todo', 'ongoing', 'in_review', 'in_revision', 'approved', 'posted'];
    const stats = {};

    for (const status of statuses) {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as count ${baseQuery} ${whereClause} AND t.status = ?`,
        [...params, status]
      );
      stats[status] = rows[0].count;
    }

    const [total] = await pool.execute(`SELECT COUNT(*) as count ${baseQuery} ${whereClause}`, params);
    stats.total = total[0].count;

    const [overdue] = await pool.execute(
      `SELECT COUNT(*) as count ${baseQuery} ${whereClause} AND t.deadline < NOW() AND t.status NOT IN ('approved','posted')`,
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
