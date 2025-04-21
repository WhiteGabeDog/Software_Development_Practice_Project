// routes/admin.js
const express = require('express');
const router = express.Router();
const { emergencyCancel } = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

router.post('/emergency-cancel', protect, authorize('admin'), emergencyCancel);

module.exports = router;
