const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Platform Dashboard
router.get('/dashboard', platformController.getPlatformDashboard);

// Organisation CRUD
router.get('/organisations', platformController.listOrganisations);
router.post('/organisations', platformController.createOrganisation);
router.get('/organisations/:id', platformController.getOrganisationById);
router.put('/organisations/:id', platformController.updateOrganisation);
router.delete('/organisations/:id', platformController.deleteOrganisation);

// Subscriptions
router.get('/subscriptions', platformController.listSubscriptionPlans);
router.post('/subscriptions', platformController.createSubscriptionPlan);

// Audit logs
router.get('/audit-logs', platformController.listAuditLogs);

// Settings
router.get('/settings', platformController.getPlatformSettings);
router.put('/settings', platformController.updatePlatformSettings);

module.exports = router;
