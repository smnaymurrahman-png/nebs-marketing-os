const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// ── ADS REPORTS ──────────────────────────────────────────────

// GET /api/reports/ads
const getAdsReports = async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT ar.*, u.full_name as submitted_by_name
      FROM ads_reports ar
      LEFT JOIN users u ON ar.submitted_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user.access_level === 'user') {
      query += ' AND ar.submitted_by = ?';
      params.push(user.id);
    }

    query += ' ORDER BY ar.created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/reports/ads
const createAdsReport = async (req, res) => {
  try {
    const { campaign_name, platform, date_from, date_to, total_spend, cpa, ctr, clicks, impressions, rating, notes } = req.body;
    if (!campaign_name || !platform || !date_from || !date_to || !rating) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO ads_reports (id, campaign_name, platform, date_from, date_to, total_spend, cpa, ctr, clicks, impressions, rating, notes, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, campaign_name, platform, date_from, date_to, total_spend || 0, cpa || 0, ctr || 0,
        clicks || 0, impressions || 0, rating, notes || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Report submitted', data: { id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/reports/ads/:id
const updateAdsReport = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM ads_reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report not found' });

    const r = rows[0];
    if (r.submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { campaign_name, platform, date_from, date_to, total_spend, cpa, ctr, clicks, impressions, rating, notes, admin_comment } = req.body;
    await pool.execute(
      `UPDATE ads_reports SET campaign_name=?, platform=?, date_from=?, date_to=?, total_spend=?, cpa=?, ctr=?, clicks=?, impressions=?, rating=?, notes=?, admin_comment=?, updated_at=NOW() WHERE id=?`,
      [campaign_name ?? r.campaign_name, platform ?? r.platform, date_from ?? r.date_from,
        date_to ?? r.date_to, total_spend ?? r.total_spend, cpa ?? r.cpa, ctr ?? r.ctr,
        clicks ?? r.clicks, impressions ?? r.impressions, rating ?? r.rating, notes ?? r.notes,
        req.user.access_level !== 'user' ? (admin_comment ?? r.admin_comment) : r.admin_comment,
        req.params.id]
    );
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/reports/ads/:id
const deleteAdsReport = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT submitted_by FROM ads_reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (rows[0].submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await pool.execute('DELETE FROM ads_reports WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── CONTENT REPORTS ──────────────────────────────────────────

// GET /api/reports/content
const getContentReports = async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT cr.*, u.full_name as submitted_by_name
      FROM content_reports cr
      LEFT JOIN users u ON cr.submitted_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user.access_level === 'user') {
      query += ' AND cr.submitted_by = ?';
      params.push(user.id);
    }

    query += ' ORDER BY cr.created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/reports/content
const createContentReport = async (req, res) => {
  try {
    const { content_name, platform, post_date, clicks, likes, comments, shares, impressions, rating, notes } = req.body;
    if (!content_name || !platform || !post_date || !rating) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO content_reports (id, content_name, platform, post_date, clicks, likes, comments, shares, impressions, rating, notes, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, content_name, platform, post_date, clicks || 0, likes || 0, comments || 0,
        shares || 0, impressions || 0, rating, notes || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Report submitted', data: { id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/reports/content/:id
const updateContentReport = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM content_reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report not found' });

    const r = rows[0];
    if (r.submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content_name, platform, post_date, clicks, likes, comments, shares, impressions, rating, notes, admin_comment } = req.body;
    await pool.execute(
      `UPDATE content_reports SET content_name=?, platform=?, post_date=?, clicks=?, likes=?, comments=?, shares=?, impressions=?, rating=?, notes=?, admin_comment=?, updated_at=NOW() WHERE id=?`,
      [content_name ?? r.content_name, platform ?? r.platform, post_date ?? r.post_date,
        clicks ?? r.clicks, likes ?? r.likes, comments ?? r.comments, shares ?? r.shares,
        impressions ?? r.impressions, rating ?? r.rating, notes ?? r.notes,
        req.user.access_level !== 'user' ? (admin_comment ?? r.admin_comment) : r.admin_comment,
        req.params.id]
    );
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/reports/content/:id
const deleteContentReport = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT submitted_by FROM content_reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (rows[0].submitted_by !== req.user.id && req.user.access_level === 'user') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await pool.execute('DELETE FROM content_reports WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAdsReports, createAdsReport, updateAdsReport, deleteAdsReport,
  getContentReports, createContentReport, updateContentReport, deleteContentReport
};
