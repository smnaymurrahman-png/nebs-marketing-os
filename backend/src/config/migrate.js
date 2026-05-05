require('dotenv').config();
const { pool } = require('./database');

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department ENUM('Design','Copywriting','Social Media','Ads','Strategy','Management','Other') NOT NULL DEFAULT 'Other',
    role VARCHAR(100) NOT NULL,
    access_level ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user',
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('task','meeting','idea','report','system') NOT NULL DEFAULT 'system',
    reference_id VARCHAR(36) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Tasks table
  `CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    status ENUM('new','todo','ongoing','in_review','in_revision','approved','posted') NOT NULL DEFAULT 'new',
    deadline DATETIME DEFAULT NULL,
    content_box TEXT DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Task assignments
  `CREATE TABLE IF NOT EXISTS task_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (task_id, user_id)
  )`,

  // Task checklist items
  `CREATE TABLE IF NOT EXISTS task_checklist (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(36) DEFAULT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME DEFAULT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Task files / attachments
  `CREATE TABLE IF NOT EXISTS task_files (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT DEFAULT 0,
    uploaded_by VARCHAR(36) NOT NULL,
    review_status ENUM('pending','accepted','rejected') DEFAULT 'pending',
    review_comment TEXT DEFAULT NULL,
    reviewed_by VARCHAR(36) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Task comments
  `CREATE TABLE IF NOT EXISTS task_comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Ideas / Ideation Center
  `CREATE TABLE IF NOT EXISTS ideas (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    doc_url VARCHAR(500) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    reference_links JSON DEFAULT NULL,
    submitted_by VARCHAR(36) NOT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_comment TEXT DEFAULT NULL,
    reviewed_by VARCHAR(36) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Meetings
  `CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    topic VARCHAR(255) NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    notes TEXT DEFAULT NULL,
    requested_by VARCHAR(36) NOT NULL,
    status ENUM('pending','approved','rejected','done') DEFAULT 'pending',
    admin_comment TEXT DEFAULT NULL,
    reviewed_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Meeting attendees
  `CREATE TABLE IF NOT EXISTS meeting_attendees (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    meeting_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendee (meeting_id, user_id)
  )`,

  // Calendar events
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    event_type ENUM('task','meeting','content','manual') NOT NULL DEFAULT 'manual',
    event_date DATE NOT NULL,
    event_time TIME DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#1A56DB',
    linked_task_id VARCHAR(36) DEFAULT NULL,
    linked_meeting_id VARCHAR(36) DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Ads reports
  `CREATE TABLE IF NOT EXISTS ads_reports (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    campaign_name VARCHAR(255) NOT NULL,
    platform ENUM('Meta Ads','Google Ads','TikTok Ads','LinkedIn Ads','Other') NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    total_spend DECIMAL(10,2) DEFAULT 0,
    cpa DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    clicks INT DEFAULT 0,
    impressions INT DEFAULT 0,
    rating ENUM('Great','Good','Bad','Worst') NOT NULL,
    notes TEXT DEFAULT NULL,
    submitted_by VARCHAR(36) NOT NULL,
    admin_comment TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Content performance reports
  `CREATE TABLE IF NOT EXISTS content_reports (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    content_name VARCHAR(255) NOT NULL,
    platform ENUM('Facebook','Instagram','LinkedIn','TikTok','YouTube','Other') NOT NULL,
    post_date DATE NOT NULL,
    clicks INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    impressions INT DEFAULT 0,
    rating ENUM('Great','Good','Bad','Worst') NOT NULL,
    notes TEXT DEFAULT NULL,
    submitted_by VARCHAR(36) NOT NULL,
    admin_comment TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Password reset tokens
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`
];

async function migrate() {
  console.log('🚀 Running migrations...');
  for (let i = 0; i < migrations.length; i++) {
    try {
      await pool.execute(migrations[i]);
      console.log(`✅ Migration ${i + 1}/${migrations.length} done`);
    } catch (err) {
      console.error(`❌ Migration ${i + 1} failed:`, err.message);
      process.exit(1);
    }
  }
  console.log('🎉 All migrations completed!');
  process.exit(0);
}

migrate();
