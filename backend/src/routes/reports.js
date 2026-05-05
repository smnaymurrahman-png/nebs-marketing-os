const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getAdsReports, createAdsReport, updateAdsReport, deleteAdsReport,
  getContentReports, createContentReport, updateContentReport, deleteContentReport
} = require('../controllers/reportsController');

// Ads reports
router.get('/ads', authenticate, getAdsReports);
router.post('/ads', authenticate, createAdsReport);
router.put('/ads/:id', authenticate, updateAdsReport);
router.delete('/ads/:id', authenticate, deleteAdsReport);

// Content reports
router.get('/content', authenticate, getContentReports);
router.post('/content', authenticate, createContentReport);
router.put('/content/:id', authenticate, updateContentReport);
router.delete('/content/:id', authenticate, deleteContentReport);

module.exports = router;
