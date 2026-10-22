const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structureController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

// Summary / Stats
router.get('/summary', structureController.getStructureSummary);

// Buildings
router.get('/buildings', structureController.listBuildings);
router.get('/buildings/:id', structureController.getBuildingById);
router.post('/buildings', structureController.createBuilding);
router.put('/buildings/:id', structureController.updateBuilding);
router.delete('/buildings/:id', structureController.deleteBuilding);

// Floors
router.get('/floors', structureController.listFloors);
router.get('/floors/:id', structureController.getFloorById);
router.post('/floors', structureController.createFloor);
router.put('/floors/:id', structureController.updateFloor);
router.delete('/floors/:id', structureController.deleteFloor);

// Units & Spaces
router.get('/units', structureController.listUnits);
router.get('/units/:id', structureController.getUnitById);
router.post('/units', structureController.createUnit);
router.put('/units/:id', structureController.updateUnit);
router.put('/units/:id/status', structureController.updateUnitStatus);
router.delete('/units/:id', structureController.deleteUnit);

module.exports = router;
