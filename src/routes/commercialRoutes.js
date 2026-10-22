const express = require('express');
const router = express.Router();
const commercialController = require('../controllers/commercialController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Tenant Companies
router.get('/companies', commercialController.listTenantCompanies);
router.post('/companies', commercialController.createTenantCompany);

// Aggregate Leases
router.get('/leases', commercialController.listLeases);
router.post('/leases', commercialController.createLease);
router.get('/leases/:id', commercialController.getLeaseById);

module.exports = router;
