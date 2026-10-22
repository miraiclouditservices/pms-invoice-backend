const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');
const taxInvoiceController = require('../controllers/taxInvoiceController');

// Public route for customer pay portal
router.get('/public/:id', taxInvoiceController.getPublicInvoiceForPay);

// Authenticated and Tenant-isolated routes
router.use(authenticate);
router.use(tenantMiddleware);

// --- Business Profile ---
router.get('/business-profile', taxInvoiceController.getBusinessProfile);
router.put('/business-profile', taxInvoiceController.updateBusinessProfile);

// --- Customers ---
router.get('/customers', taxInvoiceController.listCustomers);
router.post('/customers', taxInvoiceController.createCustomer);
router.get('/customers/:id', taxInvoiceController.getCustomer);
router.patch('/customers/:id', taxInvoiceController.updateCustomer);

// --- Invoices ---
router.get('/invoices/stats', taxInvoiceController.getInvoiceStats);
router.get('/invoices', taxInvoiceController.listInvoices);
router.post('/invoices', taxInvoiceController.createInvoice);
router.get('/invoices/:id', taxInvoiceController.getInvoice);
router.patch('/invoices/:id', taxInvoiceController.updateInvoice);
router.post('/invoices/:id/issue', taxInvoiceController.issueInvoice);
router.post('/invoices/:id/send', taxInvoiceController.issueAndSendInvoice);
router.post('/invoices/:id/email', taxInvoiceController.sendInvoiceEmailOnly);
router.get('/invoices/:id/pdf', taxInvoiceController.downloadPdf);
router.post('/invoices/:id/remind', taxInvoiceController.sendReminder);
router.post('/invoices/:id/cancel', taxInvoiceController.cancelInvoice);

// --- Payments & Cashfree Link ---
router.post('/invoices/:id/payment-link', taxInvoiceController.generatePaymentLinkManual);
router.get('/invoices/:id/payments', taxInvoiceController.listInvoicePayments);
router.get('/payments', taxInvoiceController.listAllPayments);

// --- Emails ---
router.get('/invoices/:id/emails', taxInvoiceController.listInvoiceEmails);
router.get('/emails', taxInvoiceController.listAllEmailLogs);

module.exports = router;
