const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { tenantMiddleware } = require('../middlewares/tenantMiddleware');

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/change-password', userController.changePassword);
router.put('/:id', userController.updateUser);
router.put('/:id/status', userController.changeUserStatus);

module.exports = router;
