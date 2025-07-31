const express = require('express');
const {
  detectDisease,
  detectPest,
  getDetectionHistory,
  getDetection,
  deleteDetection,
  getDetectionStats
} = require('../controllers/detectionController');
const { protect } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Detection routes
router.post('/disease', upload.single('plantImage'), handleMulterError, detectDisease);
router.post('/pest', upload.single('plantImage'), handleMulterError, detectPest);

// History and stats routes
router.get('/history', getDetectionHistory);
router.get('/stats', getDetectionStats);

// Individual detection routes
router.get('/:id', getDetection);
router.delete('/:id', deleteDetection);

module.exports = router;