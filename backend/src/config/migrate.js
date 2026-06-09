require('dotenv').config();
const { pool } = require('./database');

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department TEXT CHECK (department IN ('Design','Copywriting','Social Media','Ads','Strategy','Management','Other')) NOT NULL DEFAULT 'Other',
    role VARCHAR(100) NOT NULL,
    access_level TEXT CHECK (access_level IN ('super_admin','admin','user')) NOT NULL DEFAULT 'user',
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('task','meeting','idea','report','system')) NOT NULL DEFAULT 'system',
    reference_id UUID DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    priority TEXT CHECK (priority IN ('low','medium','high','urgent')) NOT NULL DEFAULT 'medium',
    status TEXT CHECK (status IN ('new','todo','ongoing','in_review','in_revision','approved','posted')) NOT NULL DEFAULT 'new',
    deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    content_box TEXT DEFAULT NULL,
    ventures JSONB DEFAULT NULL,
    platforms JSONB DEFAULT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (task_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS task_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    assigned_to UUID DEFAULT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT DEFAULT 0,
    uploaded_by UUID NOT NULL,
    review_status TEXT CHECK (review_status IN ('pending','accepted','rejected')) DEFAULT 'pending',
    review_comment TEXT DEFAULT NULL,
    reviewed_by UUID DEFAULT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    doc_url VARCHAR(500) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    reference_links JSONB DEFAULT NULL,
    ideation_for VARCHAR(255) DEFAULT NULL,
    content_type VARCHAR(50) DEFAULT NULL,
    work_status VARCHAR(30) DEFAULT 'not_started',
    backlog TEXT DEFAULT NULL,
    submitted_by UUID NOT NULL,
    status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    admin_comment TEXT DEFAULT NULL,
    reviewed_by UUID DEFAULT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `ALTER TABLE ideas ADD COLUMN IF NOT EXISTS ideation_for VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE ideas ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT NULL`,
  `ALTER TABLE ideas ADD COLUMN IF NOT EXISTS work_status VARCHAR(30) DEFAULT 'not_started'`,
  `ALTER TABLE ideas ADD COLUMN IF NOT EXISTS backlog TEXT DEFAULT NULL`,
  `ALTER TABLE ads_reports ADD COLUMN IF NOT EXISTS link VARCHAR(500) DEFAULT NULL`,
  `ALTER TABLE ads_reports ALTER COLUMN total_spend TYPE DECIMAL(14,3)`,
  `ALTER TABLE ads_reports ALTER COLUMN cpa TYPE DECIMAL(14,3)`,
  `ALTER TABLE ads_reports ALTER COLUMN ctr TYPE DECIMAL(8,3)`,

  `CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(255) NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    priority TEXT CHECK (priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
    notes TEXT DEFAULT NULL,
    requested_by UUID NOT NULL,
    status TEXT CHECK (status IN ('pending','approved','rejected','done')) DEFAULT 'pending',
    admin_comment TEXT DEFAULT NULL,
    reviewed_by UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL,
    user_id UUID NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (meeting_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    event_type TEXT CHECK (event_type IN ('task','meeting','content','manual')) NOT NULL DEFAULT 'manual',
    event_date DATE NOT NULL,
    event_time TIME DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#1A56DB',
    linked_task_id UUID DEFAULT NULL,
    linked_meeting_id UUID DEFAULT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS ads_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    platform TEXT CHECK (platform IN ('Meta Ads','Google Ads','TikTok Ads','LinkedIn Ads','Other')) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    total_spend DECIMAL(10,2) DEFAULT 0,
    cpa DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(5,2) DEFAULT 0,
    clicks INT DEFAULT 0,
    impressions INT DEFAULT 0,
    rating TEXT CHECK (rating IN ('Great','Good','Bad','Worst')) NOT NULL,
    notes TEXT DEFAULT NULL,
    submitted_by UUID NOT NULL,
    admin_comment TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_name VARCHAR(255) NOT NULL,
    platform TEXT CHECK (platform IN ('Facebook','Instagram','LinkedIn','TikTok','YouTube','Other')) NOT NULL,
    post_date DATE NOT NULL,
    clicks INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    impressions INT DEFAULT 0,
    rating TEXT CHECK (rating IN ('Great','Good','Bad','Worst')) NOT NULL,
    notes TEXT DEFAULT NULL,
    submitted_by UUID NOT NULL,
    admin_comment TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    venture VARCHAR(50) NOT NULL,
    content_type VARCHAR(30) DEFAULT NULL,
    topic TEXT DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (entry_date, venture)
  )`,

  `CREATE TABLE IF NOT EXISTS ads_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    venture VARCHAR(50) NOT NULL,
    slot SMALLINT NOT NULL,
    content_type VARCHAR(30) DEFAULT NULL,
    topic TEXT DEFAULT NULL,
    budget DECIMAL(12,2) DEFAULT NULL,
    ads_type VARCHAR(40) DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (entry_date, venture, slot)
  )`
];

async function migrate() {
  console.log('🚀 Running migrations...');
  for (let i = 0; i < migrations.length; i++) {
    try {
      await pool.query(migrations[i]);
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
