const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

const safeUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

// GET /api/users — list all users (admin+)
const getUsers = async (req, res) => {
  try {
    const { department, access_level, search } = req.query;
    let query = `SELECT id, full_name, work_email, department, role, access_level, is_active, avatar_url, last_login, created_at FROM users WHERE 1=1`;
    const params = [];

    if (department) { query += ' AND department = ?'; params.push(department); }
    if (access_level) { query += ' AND access_level = ?'; params.push(access_level); }
    if (search) { query += ' AND (full_name LIKE ? OR work_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, work_email, department, role, access_level, is_active, avatar_url, last_login, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/users — create member (super_admin only)
const createUser = async (req, res) => {
  try {
    const { full_name, work_email, password, department, role, access_level } = req.body;

    if (!full_name || !work_email || !password || !department || !role || !access_level) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Super admin can only be created through seeding
    if (access_level === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot create super admin through this endpoint' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE work_email = ?', [work_email.toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO users (id, full_name, work_email, password, department, role, access_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, full_name, work_email.toLowerCase(), hashedPassword, department, role, access_level]
    );

    const [newUser] = await pool.execute(
      'SELECT id, full_name, work_email, department, role, access_level, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    res.status(201).json({ success: true, message: 'Member created successfully', data: newUser[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/:id — update member
const updateUser = async (req, res) => {
  try {
    const { full_name, work_email, department, role, access_level, is_active } = req.body;
    const { id } = req.params;

    // Only super_admin can change access levels
    if (access_level && req.user.access_level !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super admin can change access level' });
    }

    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'User not found' });

    // Protect super admin from being downgraded by non-super-admin
    if (existing[0].access_level === 'super_admin' && req.user.access_level !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify super admin' });
    }

    await pool.execute(
      `UPDATE users SET full_name = ?, work_email = ?, department = ?, role = ?, access_level = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
      [
        full_name || existing[0].full_name,
        work_email || existing[0].work_email,
        department || existing[0].department,
        role || existing[0].role,
        access_level || existing[0].access_level,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    const [updated] = await pool.execute(
      'SELECT id, full_name, work_email, department, role, access_level, is_active, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Member updated successfully', data: updated[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/users/:id — delete member (super_admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const [existing] = await pool.execute('SELECT access_level FROM users WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'User not found' });

    if (existing[0].access_level === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete super admin' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/users/:id/reset-password
const adminResetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const hashed = await bcrypt.hash(new_password, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, adminResetPassword };
