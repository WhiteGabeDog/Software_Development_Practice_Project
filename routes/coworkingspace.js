const express = require('express');
const { getCoWorkingSpaces, getCoWorkingSpace, createCoWorkingSpace, updateCoWorkingSpace, deleteCoWorkingSpace } = require('../controllers/coworkingspace');
const router = express.Router();

//Include other resource routers
const appointmentRouter = require('./appointments');

const { protect,authorize } = require('../middleware/auth');

//Re-route into other resource routers
router.use('/:coworkingspaceId/appointments/',appointmentRouter);

router.route('/').get(getCoWorkingSpaces).post(protect, authorize('admin'), createCoWorkingSpace);
router.route('/:id').get(getCoWorkingSpace).put(protect, authorize('admin'),updateCoWorkingSpace).delete(protect, authorize('admin'),deleteCoWorkingSpace);

module.exports = router;