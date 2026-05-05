const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function createNotification({ userId, title, message, type = 'system', referenceId = null }) {
  try {
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), userId, title, message, type, referenceId]
    );
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
}

async function createBulkNotifications(userIds, { title, message, type, referenceId }) {
  for (const userId of userIds) {
    await createNotification({ userId, title, message, type, referenceId });
  }
}

module.exports = { createNotification, createBulkNotifications };
