const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/roles', rbacController.listRoles);
router.post('/roles', rbacController.createRole);
router.get('/permissions', rbacController.listPermissions);
router.get('/assignments', rbacController.listUserAssignments);
router.post('/assignments', rbacController.assignRoleToUser);

module.exports = router;
