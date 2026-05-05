require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Create upload directory
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Nebs Marketing OS API is running', version: '1.0.0' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ideas', require('./routes/ideas'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/reports', require('./routes/reports'));

// 404 & Error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 Nebs Marketing OS API running on http://localhost:${PORT}`);
    console.log(`📚 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

start();
