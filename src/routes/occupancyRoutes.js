const express = require('express');
const router = express.Router();
const occupancyController = require('../controllers/occupancyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

const { agreementUpload } = require('../middlewares/uploadMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Metrics
router.get('/metrics', occupancyController.getOccupancyMetrics);

// Spatial Allocations
router.get('/allocations', occupancyController.listAllocations);

// Contract Agreements
router.get('/agreements', occupancyController.listAgreements);
router.get('/agreements/:id', occupancyController.getAgreementById);
router.put('/agreements/:id', occupancyController.updateAgreement);
router.post('/agreements/:id/documents', agreementUpload.single('file'), occupancyController.uploadAgreementDocument);
router.delete('/agreements/:id/documents/:docId', occupancyController.deleteAgreementDocument);

// Occupancies CRUD
router.get('/', occupancyController.listOccupancies);
router.get('/:id', occupancyController.getOccupancyById);
router.post('/', occupancyController.createOccupancy);
router.put('/:id/status', occupancyController.updateOccupancyStatus);
router.post('/:id/release-allocation', occupancyController.releaseAllocation);
router.post('/:id/invite-account', occupancyController.inviteAccount);

module.exports = router;
