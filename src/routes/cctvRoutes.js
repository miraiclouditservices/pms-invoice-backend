const express = require('express');
const router = express.Router();
const cctvController = require('../controllers/cctvController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public / Token-authenticated Stream Session Proxy
router.get('/streams/:sessionToken/live', cctvController.streamLiveProxy);
router.get('/streams/:sessionToken/snapshot', cctvController.snapshotProxy);

// Multi-Vendor Webhooks (Open for camera/recorder inbound HTTP alarm reporting)
router.post('/webhooks/:vendor/:deviceId', cctvController.handleWebhook);
router.post('/webhooks/:deviceId', cctvController.handleWebhook);

// Protected CCTV Routes
router.use(authenticate);

// 1. Notification endpoints
router.get('/notifications', cctvController.getNotifications);
router.get('/notifications/unread-count', cctvController.getUnreadCount);
router.patch('/notifications/read-all', cctvController.markAllAsRead);
router.get('/notifications/:id', cctvController.getNotificationById);
router.patch('/notifications/:id/read', cctvController.markAsRead);
router.patch('/notifications/:id/acknowledge', cctvController.acknowledgeAlert);
router.patch('/notifications/:id/resolve', cctvController.resolveAlert);
router.patch('/notifications/:id/reopen', cctvController.reopenAlert);

// 2. Events
router.get('/events', cctvController.getEvents);
router.get('/events/:id', cctvController.getEventById);
router.post('/events/simulate-hardware-event', cctvController.simulateHardwareEvent);

// 3. Devices & Discovery
router.post('/devices/test-connection', cctvController.testConnection);
router.post('/devices/discover', cctvController.testConnection);
router.post('/devices/register', cctvController.registerDevice);
router.get('/devices', cctvController.getDevices);
router.get('/devices/:id', cctvController.getDeviceById);
router.patch('/devices/:id', cctvController.updateDevice);
router.get('/devices/:id/capabilities', cctvController.getDeviceCapabilities);
router.get('/devices/:id/health', cctvController.getDeviceHealth);
router.post('/devices/:id/reconnect', cctvController.reconnectDevice);

// 4. Channel Mapping
router.get('/devices/:id/channels', cctvController.getDeviceChannels);
router.put('/devices/:id/channels/map', cctvController.mapChannel);

// 5. Stream Session Tokens
router.post('/streams/create-session', cctvController.createStreamSession);

// 6. Rules & Escalation
router.get('/notification-rules', cctvController.getNotificationRules);
router.post('/notification-rules', cctvController.createNotificationRule);
router.patch('/notification-rules/:id', cctvController.updateNotificationRule);

router.get('/escalation-rules', cctvController.getEscalationRules);
router.post('/escalation-rules', cctvController.createEscalationRule);

// 7. Audit Logs
router.get('/access-logs', cctvController.getAccessLogs);

module.exports = router;
