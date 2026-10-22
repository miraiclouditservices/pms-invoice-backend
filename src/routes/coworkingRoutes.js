const express = require('express');
const router = express.Router();
const coworkingController = require('../controllers/coworkingController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Plans
router.get('/plans', coworkingController.listPlans);
router.post('/plans', coworkingController.createPlan);

// Members
router.get('/members', coworkingController.listMembers);
router.post('/members', coworkingController.createMember);

// Bookings
router.get('/bookings', coworkingController.listBookings);
router.post('/bookings', coworkingController.createBooking);
router.put('/bookings/:id/cancel', coworkingController.cancelBooking);

module.exports = router;
