const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { sendEmail, emailTemplates } = require('../utils/email');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE work_email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: userWithoutPassword },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE work_email = $1', [email]);

    if (!rows.length) {
      return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    const user = rows[0];
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user.id, token, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await sendEmail(user.work_email, emailTemplates.passwordReset(user.full_name, resetLink));

    res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const resetToken = rows[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, resetToken.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id]);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, department, role } = req.body;
    if (!full_name) return res.status(400).json({ success: false, message: 'Name is required' });

    await pool.query(
      'UPDATE users SET full_name=$1, department=$2, role=$3, updated_at=NOW() WHERE id=$4',
      [full_name, department || req.user.department, role || req.user.role, req.user.id]
    );

    const { rows } = await pool.query(
      'SELECT id, full_name, work_email, department, role, access_level, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'Profile updated', data: { user: rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login, getMe, forgotPassword, resetPassword, changePassword, updateProfile };
