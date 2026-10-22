const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Analytics summary
router.get('/analytics', visitorController.getVisitorAnalytics);

// Deliveries
router.get('/deliveries', visitorController.listDeliveries);
router.post('/deliveries', visitorController.createDelivery);
router.put('/deliveries/:id/status', visitorController.updateDeliveryStatus);

// Emergency Logs
router.get('/emergency-logs', visitorController.listEmergencyLogs);
router.post('/emergency-logs', visitorController.createEmergencyLog);

// QR Pass Verification
router.get('/verify-pass/:passCode', visitorController.verifyPassCode);

// Walk-in Registration
router.post('/walkin', visitorController.createWalkInVisitor);

// Visitor CRUD & Lifecycle Actions
router.get('/', visitorController.listVisitors);
router.post('/', visitorController.createVisitor);
router.get('/:id', visitorController.getVisitorById);
router.put('/:id/approve', visitorController.approveVisitor);
router.put('/:id/reject', visitorController.rejectVisitor);
router.put('/:id/checkin', visitorController.checkInVisitor);
router.put('/:id/checkout', visitorController.checkOutVisitor);
router.put('/:id/deny', visitorController.denyVisitorEntry);

module.exports = router;
