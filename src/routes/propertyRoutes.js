const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Organisation Dashboard
router.get('/dashboard', propertyController.getOrganisationDashboard);

// Properties
router.get('/', propertyController.listProperties);
router.post('/', propertyController.createProperty);
router.get('/:id', propertyController.getPropertyById);
router.get('/:id/hierarchy', propertyController.getPropertyHierarchy);
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);

// Hierarchy additions
router.post('/buildings', propertyController.createBuilding);
router.post('/floors', propertyController.createFloor);
router.post('/units', propertyController.createUnit);
router.put('/units/:id', propertyController.updateUnit);

module.exports = router;
