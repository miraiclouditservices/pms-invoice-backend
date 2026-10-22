const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/residents', apartmentController.listResidents);
router.post('/residents', apartmentController.createResident);
router.get('/residents/:id', apartmentController.getResidentById);
router.get('/flats', apartmentController.listFlats);

router.get('/notices', apartmentController.listNotices);
router.post('/notices', apartmentController.createNotice);

router.get('/amenities', apartmentController.listAmenities);

module.exports = router;
