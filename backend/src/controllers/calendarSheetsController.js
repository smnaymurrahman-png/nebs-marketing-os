const { pool } = require('../config/database');

const CONTENT_VENTURES = ['Nebs-Dev', 'Nebs-creative', 'Nebs-IT'];
const ADS_VENTURES = ['Nebs-IT', 'Nebs-Dev', 'Nebs-creative'];

// Empty string -> NULL, otherwise the trimmed value
const clean = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// ---- Content calendar -------------------------------------------------------

// GET /api/content-calendar?month=YYYY-MM
const getContentCalendar = async (req, res) => {
  try {
    const { month } = req.query;
    const params = [];
    let filter = '';
    if (month) {
      filter = `WHERE TO_CHAR(entry_date, 'YYYY-MM') = $1`;
      params.push(month);
    }
    const { rows } = await pool.query(
      `SELECT id, TO_CHAR(entry_date, 'YYYY-MM-DD') AS entry_date, venture, content_type, topic
       FROM content_calendar ${filter}
       ORDER BY entry_date ASC, venture ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/content-calendar  { entry_date, venture, content_type?, topic? }
const upsertContentCalendar = async (req, res) => {
  try {
    const { entry_date, venture } = req.body;
    if (!entry_date || !venture) {
      return res.status(400).json({ success: false, message: 'entry_date and venture are required' });
    }
    if (!CONTENT_VENTURES.includes(venture)) {
      return res.status(400).json({ success: false, message: 'Invalid venture' });
    }

    const content_type = clean(req.body.content_type);
    const topic = clean(req.body.topic);

    const sets = [];
    if (content_type !== undefined) sets.push('content_type = EXCLUDED.content_type');
    if (topic !== undefined) sets.push('topic = EXCLUDED.topic');
    sets.push('updated_at = NOW()');

    await pool.query(
      `INSERT INTO content_calendar (entry_date, venture, content_type, topic, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entry_date, venture) DO UPDATE SET ${sets.join(', ')}`,
      [entry_date, venture, content_type ?? null, topic ?? null, req.user.id]
    );
    res.json({ success: true, message: 'Saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---- Ads calendar -----------------------------------------------------------

// GET /api/ads-calendar?venture=Nebs-IT&month=YYYY-MM
const getAdsCalendar = async (req, res) => {
  try {
    const { venture, month } = req.query;
    if (!venture || !ADS_VENTURES.includes(venture)) {
      return res.status(400).json({ success: false, message: 'Valid venture is required' });
    }
    const params = [venture];
    let filter = 'WHERE venture = $1';
    if (month) {
      filter += ` AND TO_CHAR(entry_date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    const { rows } = await pool.query(
      `SELECT id, TO_CHAR(entry_date, 'YYYY-MM-DD') AS entry_date, venture, slot,
              content_type, topic, budget, ads_type
       FROM ads_calendar ${filter}
       ORDER BY entry_date ASC, slot ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/ads-calendar  { entry_date, venture, slot, content_type?, topic?, budget?, ads_type? }
const upsertAdsCalendar = async (req, res) => {
  try {
    const { entry_date, venture } = req.body;
    const slot = parseInt(req.body.slot, 10);
    if (!entry_date || !venture) {
      return res.status(400).json({ success: false, message: 'entry_date and venture are required' });
    }
    if (!ADS_VENTURES.includes(venture)) {
      return res.status(400).json({ success: false, message: 'Invalid venture' });
    }
    if (![1, 2, 3].includes(slot)) {
      return res.status(400).json({ success: false, message: 'slot must be 1, 2 or 3' });
    }

    const content_type = clean(req.body.content_type);
    const topic = clean(req.body.topic);
    const ads_type = clean(req.body.ads_type);
    let budget;
    if (req.body.budget !== undefined) {
      const raw = clean(req.body.budget);
      budget = raw === null ? null : (Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : null);
    }

    const sets = [];
    if (content_type !== undefined) sets.push('content_type = EXCLUDED.content_type');
    if (topic !== undefined) sets.push('topic = EXCLUDED.topic');
    if (budget !== undefined) sets.push('budget = EXCLUDED.budget');
    if (ads_type !== undefined) sets.push('ads_type = EXCLUDED.ads_type');
    sets.push('updated_at = NOW()');

    await pool.query(
      `INSERT INTO ads_calendar (entry_date, venture, slot, content_type, topic, budget, ads_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (entry_date, venture, slot) DO UPDATE SET ${sets.join(', ')}`,
      [entry_date, venture, slot, content_type ?? null, topic ?? null, budget ?? null, ads_type ?? null, req.user.id]
    );
    res.json({ success: true, message: 'Saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getContentCalendar,
  upsertContentCalendar,
  getAdsCalendar,
  upsertAdsCalendar,
};
