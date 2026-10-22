const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Invoices & Payments
router.get('/invoices', operationsController.listInvoices);
router.post('/invoices', operationsController.createInvoice);
router.post('/payments', operationsController.recordPayment);

// Visitors
router.get('/visitors', operationsController.listVisitors);
router.post('/visitors', operationsController.createVisitor);
router.put('/visitors/:id/checkin', operationsController.checkInVisitor);
router.put('/visitors/:id/checkout', operationsController.checkOutVisitor);

// Complaints
router.get('/complaints', operationsController.listComplaints);
router.post('/complaints', operationsController.createComplaint);
router.put('/complaints/:id/status', operationsController.updateComplaintStatus);

// Parking
router.get('/parking', operationsController.listParkingSlots);
router.post('/parking', operationsController.createParkingSlot);

// Assets & AMC
router.get('/assets', operationsController.listAssets);
router.post('/assets', operationsController.createAsset);
router.get('/amc', operationsController.listAMC);
router.post('/amc', operationsController.createAMC);

// Vendors & Work Orders
router.get('/vendors', operationsController.listVendors);
router.post('/vendors', operationsController.createVendor);
router.get('/work-orders', operationsController.listWorkOrders);
router.post('/work-orders', operationsController.createWorkOrder);
router.put('/work-orders/:id/status', operationsController.updateWorkOrderStatus);

// Reports & Exports
router.get('/reports', operationsController.getReports);
router.get('/reports/export', operationsController.exportReports);

module.exports = router;
