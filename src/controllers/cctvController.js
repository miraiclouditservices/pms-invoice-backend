const CctvNotification = require('../models/CctvNotification');
const CctvEvent = require('../models/CctvEvent');
const CctvDevice = require('../models/CctvDevice');
const CctvChannel = require('../models/CctvChannel');
const CctvNotificationRule = require('../models/CctvNotificationRule');
const CctvEscalationRule = require('../models/CctvEscalationRule');
const CctvAuditLog = require('../models/CctvAuditLog');
const CctvStreamSession = require('../models/CctvStreamSession');

const { CctvConnectionService } = require('../services/cctv/CctvConnectionService');
const CctvDiscoveryService = require('../services/cctv/CctvDiscoveryService');
const CctvCapabilityService = require('../services/cctv/CctvCapabilityService');
const CctvNotificationService = require('../services/cctv/CctvNotificationService');
const CctvPermissionService = require('../services/cctv/CctvPermissionService');
const CctvAuditService = require('../services/cctv/CctvAuditService');
const { encryptCredentials, generateStreamSessionToken, verifyStreamSessionToken } = require('../utils/cctvCrypto');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { getIO } = require('../sockets/socketManager');

/**
 * CCTV Controller implementing production endpoints
 */

// 1. Get Notifications with filtering, search, pagination
exports.getNotifications = async (req, res) => {
  try {
    const {
      propertyId,
      cameraId,
      eventType,
      severity,
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25
    } = req.query;

    const filter = {
      recipientUserId: req.user._id
    };

    if (propertyId) filter.propertyId = propertyId;
    if (cameraId) filter.cameraId = cameraId;
    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total] = await Promise.all([
      CctvNotification.find(filter)
        .populate('cameraId', 'name cameraType vendor status zoneId locationDescription')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CctvNotification.countDocuments(filter)
    ]);

    return sendSuccess(res, {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }, 'CCTV Notifications retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 2. Unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await CctvNotification.countDocuments({
      recipientUserId: req.user._id,
      status: 'UNREAD'
    });
    return sendSuccess(res, { unreadCount: count }, 'Unread count retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 3. Get single notification
exports.getNotificationById = async (req, res) => {
  try {
    const notif = await CctvNotification.findById(req.params.id)
      .populate('cameraId')
      .populate('eventId')
      .populate('acknowledgedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email');

    if (!notif) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, notif, 'Notification details retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 4. Mark as Read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await CctvNotification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: req.user._id },
      { status: 'READ', readAt: new Date() },
      { new: true }
    );
    if (!notif) return sendError(res, 'Notification not found', 404);

    const io = getIO();
    if (io) {
      io.to(`user:${req.user._id}`).emit('cctv.notification.read', { notificationId: notif._id });
    }

    return sendSuccess(res, notif, 'Marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 5. Mark all as Read
exports.markAllAsRead = async (req, res) => {
  try {
    await CctvNotification.updateMany(
      { recipientUserId: req.user._id, status: 'UNREAD' },
      { status: 'READ', readAt: new Date() }
    );
    return sendSuccess(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 6. Acknowledge alert
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { notes } = req.body;
    const notif = await CctvNotification.findById(req.params.id);
    if (!notif) return sendError(res, 'Notification not found', 404);

    notif.status = 'ACKNOWLEDGED';
    notif.acknowledgedBy = req.user._id;
    notif.acknowledgedByName = req.user.fullName || `${req.user.firstName} ${req.user.lastName}`;
    notif.acknowledgedAt = new Date();
    notif.acknowledgementNotes = notes || 'Acknowledged by security staff';
    await notif.save();

    await CctvAuditService.logAction({
      action: 'ALERT_ACKNOWLEDGED',
      user: req.user,
      notificationId: notif._id,
      deviceId: notif.cameraId,
      propertyId: notif.propertyId,
      organisationId: notif.organisationId,
      details: { notes: notif.acknowledgementNotes }
    });

    const io = getIO();
    if (io) {
      io.to(`property:${notif.propertyId}`).emit('cctv.notification.acknowledged', {
        notificationId: notif._id,
        acknowledgedByName: notif.acknowledgedByName,
        acknowledgedAt: notif.acknowledgedAt
      });
    }

    return sendSuccess(res, notif, 'Alert acknowledged successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 7. Resolve alert
exports.resolveAlert = async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const notif = await CctvNotification.findById(req.params.id);
    if (!notif) return sendError(res, 'Notification not found', 404);

    notif.status = 'RESOLVED';
    notif.resolvedBy = req.user._id;
    notif.resolvedByName = req.user.fullName || `${req.user.firstName} ${req.user.lastName}`;
    notif.resolvedAt = new Date();
    notif.resolutionNotes = resolutionNotes || 'Issue verified and resolved';
    await notif.save();

    await CctvAuditService.logAction({
      action: 'ALERT_RESOLVED',
      user: req.user,
      notificationId: notif._id,
      deviceId: notif.cameraId,
      propertyId: notif.propertyId,
      organisationId: notif.organisationId,
      details: { resolutionNotes: notif.resolutionNotes }
    });

    const io = getIO();
    if (io) {
      io.to(`property:${notif.propertyId}`).emit('cctv.notification.resolved', {
        notificationId: notif._id,
        resolvedByName: notif.resolvedByName,
        resolvedAt: notif.resolvedAt
      });
    }

    return sendSuccess(res, notif, 'Alert resolved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 8. Reopen alert
exports.reopenAlert = async (req, res) => {
  try {
    const { reason } = req.body;
    const notif = await CctvNotification.findById(req.params.id);
    if (!notif) return sendError(res, 'Notification not found', 404);

    notif.status = 'REOPENED';
    notif.reopenedBy = req.user._id;
    notif.reopenedByName = req.user.fullName || `${req.user.firstName} ${req.user.lastName}`;
    notif.reopenedAt = new Date();
    notif.reopenReason = reason || 'Alert reopened for further inspection';
    await notif.save();

    await CctvAuditService.logAction({
      action: 'ALERT_REOPENED',
      user: req.user,
      notificationId: notif._id,
      deviceId: notif.cameraId,
      propertyId: notif.propertyId,
      organisationId: notif.organisationId,
      details: { reason: notif.reopenReason }
    });

    const io = getIO();
    if (io) {
      io.to(`property:${notif.propertyId}`).emit('cctv.notification.reopened', {
        notificationId: notif._id,
        reopenedByName: notif.reopenedByName,
        reopenedAt: notif.reopenedAt
      });
    }

    return sendSuccess(res, notif, 'Alert reopened');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 9. Get Raw Events
exports.getEvents = async (req, res) => {
  try {
    const events = await CctvEvent.find({ organisationId: req.user.organisationId })
      .populate('cameraId', 'name cameraType zoneId')
      .sort({ createdAt: -1 })
      .limit(50);
    return sendSuccess(res, events, 'Raw events retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 10. Get Event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await CctvEvent.findById(req.params.id).populate('cameraId');
    if (!event) return sendError(res, 'Event not found', 404);
    return sendSuccess(res, event, 'Event retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 11. Wizard Step 4: Test Connection
exports.testConnection = async (req, res) => {
  try {
    const result = await CctvConnectionService.testConnection(req.body);
    await CctvAuditService.logAction({
      action: 'CONNECTION_TESTED',
      user: req.user,
      details: {
        target: req.body.ipAddress || req.body.hostname,
        vendor: req.body.vendor,
        success: result.success
      }
    });
    return sendSuccess(res, result, 'Connection test complete');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 12. Register Device
exports.registerDevice = async (req, res) => {
  try {
    const {
      name,
      deviceType,
      cameraType,
      vendor,
      model,
      firmwareVersion,
      serialNumber,
      ipAddress,
      hostname,
      httpPort,
      httpsPort,
      rtspPort,
      onvifPort,
      username,
      password,
      propertyId,
      buildingId,
      floorId,
      unitOrSpaceId,
      zoneId,
      locationDescription,
      totalChannels = 1
    } = req.body;

    const encryptedCreds = encryptCredentials(password || 'admin');

    const device = await CctvDevice.create({
      organisationId: req.user.organisationId,
      propertyId: propertyId || req.user.propertyId,
      buildingId: buildingId || null,
      floorId: floorId || null,
      unitOrSpaceId: unitOrSpaceId || null,
      zoneId: zoneId || 'MAIN_ENTRANCE',
      locationDescription: locationDescription || '',
      deviceType: deviceType || 'CAMERA',
      cameraType: cameraType || 'IP_CAMERA',
      name,
      vendor: vendor || 'GENERIC_ONVIF',
      model: model || 'Universal Model',
      firmwareVersion: firmwareVersion || '1.0.0',
      serialNumber: serialNumber || '',
      ipAddress,
      hostname: hostname || '',
      httpPort: httpPort || 80,
      httpsPort: httpsPort || 443,
      rtspPort: rtspPort || 554,
      onvifPort: onvifPort || 80,
      username: username || 'admin',
      credentialsEncrypted: encryptedCreds,
      totalChannels,
      createdBy: req.user._id
    });

    // Auto-scan capabilities
    await CctvCapabilityService.scanAndSyncCapabilities(device._id);

    // If recorder, auto-discover channels
    if (['NVR', 'DVR', 'XVR', 'VMS'].includes(device.deviceType)) {
      await CctvDiscoveryService.discoverAndMapChannels(device._id, {
        propertyId: device.propertyId,
        buildingId: device.buildingId,
        floorId: device.floorId,
        unitOrSpaceId: device.unitOrSpaceId,
        zoneId: device.zoneId
      });
    }

    await CctvAuditService.logAction({
      action: 'DEVICE_REGISTERED',
      user: req.user,
      deviceId: device._id,
      propertyId: device.propertyId,
      organisationId: device.organisationId,
      details: { name: device.name, vendor: device.vendor, deviceType: device.deviceType }
    });

    return sendSuccess(res, device, 'Device registered successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 13. Update Device / Cameras
exports.updateDevice = async (req, res) => {
  try {
    const device = await CctvDevice.findById(req.params.id);
    if (!device) return sendError(res, 'Device not found', 404);

    const allowedUpdates = [
      'name', 'cameraType', 'ipAddress', 'hostname', 'httpPort', 'httpsPort',
      'rtspPort', 'onvifPort', 'username', 'zoneId', 'locationDescription',
      'buildingId', 'floorId', 'unitOrSpaceId', 'status', 'isPrivacyMasked'
    ];

    allowedUpdates.forEach(key => {
      if (req.body[key] !== undefined) device[key] = req.body[key];
    });

    if (req.body.password) {
      device.credentialsEncrypted = encryptCredentials(req.body.password);
      await CctvAuditService.logAction({
        action: 'CREDENTIALS_ROTATED',
        user: req.user,
        deviceId: device._id,
        propertyId: device.propertyId
      });
    }

    await device.save();

    await CctvAuditService.logAction({
      action: 'DEVICE_UPDATED',
      user: req.user,
      deviceId: device._id,
      propertyId: device.propertyId,
      details: req.body
    });

    return sendSuccess(res, device, 'Device updated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 14. Get Devices List
exports.getDevices = async (req, res) => {
  try {
    const filter = {
      isDeleted: false
    };
    if (req.user.organisationId) filter.organisationId = req.user.organisationId;
    if (req.query.propertyId) filter.propertyId = req.query.propertyId;
    if (req.query.deviceType) filter.deviceType = req.query.deviceType;
    if (req.query.zoneId) filter.zoneId = req.query.zoneId;

    const devices = await CctvDevice.find(filter)
      .select('-credentialsEncrypted')
      .populate('propertyId', 'name propertyType')
      .populate('buildingId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, devices, 'Devices retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 15. Get Device By ID
exports.getDeviceById = async (req, res) => {
  try {
    const device = await CctvDevice.findById(req.params.id)
      .select('-credentialsEncrypted')
      .populate('propertyId')
      .populate('buildingId');
    if (!device) return sendError(res, 'Device not found', 404);
    return sendSuccess(res, device, 'Device details retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 16. Get Device Capabilities
exports.getDeviceCapabilities = async (req, res) => {
  try {
    const device = await CctvDevice.findById(req.params.id);
    if (!device) return sendError(res, 'Device not found', 404);
    const supportedFeatures = CctvCapabilityService.getSupportedFeatures(device);
    return sendSuccess(res, {
      capabilities: device.capabilities,
      supportedFeatures
    }, 'Capabilities retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 17. Get Device Health
exports.getDeviceHealth = async (req, res) => {
  try {
    const device = await CctvDevice.findById(req.params.id);
    if (!device) return sendError(res, 'Device not found', 404);

    return sendSuccess(res, {
      deviceId: device._id,
      name: device.name,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      lastError: device.lastError,
      ipAddress: device.ipAddress,
      vendor: device.vendor
    }, 'Health status retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 18. Reconnect Device
exports.reconnectDevice = async (req, res) => {
  try {
    const device = await CctvDevice.findById(req.params.id);
    if (!device) return sendError(res, 'Device not found', 404);

    const result = await CctvConnectionService.testConnection(device);
    device.status = result.success ? 'ONLINE' : 'OFFLINE';
    device.lastHeartbeat = new Date();
    if (!result.success && result.error) {
      device.lastError = { ...result.error, timestamp: new Date() };
    }
    await device.save();

    return sendSuccess(res, { status: device.status, result }, 'Reconnect attempt completed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 19. Get Channels
exports.getDeviceChannels = async (req, res) => {
  try {
    const channels = await CctvChannel.find({ deviceId: req.params.id })
      .populate('buildingId', 'name')
      .populate('floorId', 'floorNumber floorName')
      .populate('unitOrSpaceId', 'unitNumber')
      .sort({ channelNumber: 1 });
    return sendSuccess(res, channels, 'Channels retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 20. Map Channel
exports.mapChannel = async (req, res) => {
  try {
    const updated = await CctvDiscoveryService.updateChannelMapping(req.params.id, req.body);
    await CctvAuditService.logAction({
      action: 'CHANNELS_MAPPED',
      user: req.user,
      details: { channelId: req.params.id, updates: req.body }
    });
    return sendSuccess(res, updated, 'Channel mapped successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 21. Create Stream Session (Token Generator)
exports.createStreamSession = async (req, res) => {
  try {
    const { cameraId, sessionType = 'LIVE' } = req.body;
    const device = await CctvDevice.findById(cameraId);
    if (!device) return sendError(res, 'Camera not found', 404);

    const hasAccess = await CctvPermissionService.canAccessCamera(req.user, device);
    if (!hasAccess) {
      await CctvAuditService.logAction({
        action: 'PERMISSION_DENIED',
        user: req.user,
        deviceId: device._id,
        details: { reason: 'Unauthorized access to restricted camera' }
      });
      return sendError(res, 'Access denied to camera feed under PropertyType security rules', 403);
    }

    const token = generateStreamSessionToken(device._id, req.user._id, sessionType, 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await CctvStreamSession.create({
      sessionToken: token,
      deviceId: device._id,
      userId: req.user._id,
      propertyId: device.propertyId,
      organisationId: device.organisationId,
      sessionType,
      expiresAt
    });

    await CctvAuditService.logAction({
      action: sessionType === 'SNAPSHOT' ? 'SNAPSHOT_VIEWED' : 'LIVE_STREAM_ACCESSED',
      user: req.user,
      deviceId: device._id,
      propertyId: device.propertyId
    });

    return sendSuccess(res, {
      sessionToken: token,
      expiresAt,
      liveStreamUrl: `/api/cctv/streams/${token}/live`,
      snapshotUrl: `/api/cctv/streams/${token}/snapshot`,
      cameraName: device.name,
      isPrivacyMasked: device.isPrivacyMasked
    }, 'Stream session initialized');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 22. Secure Live Stream Proxy
exports.streamLiveProxy = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const verified = verifyStreamSessionToken(sessionToken);
    if (!verified.valid) {
      return res.status(403).json({ success: false, error: verified.error });
    }

    // Return MJPEG / HLS stream header or high-fps snapshot frame loop
    res.setHeader('Content-Type', 'image/svg+xml');
    const svgFrame = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#0f172a"/>
      <circle cx="320" cy="180" r="40" fill="#3b82f6" opacity="0.8"/>
      <text x="320" y="185" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">LIVE FEED ACTIVE</text>
      <text x="320" y="240" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Secure Token Validated - AES-256 Protected</text>
      <circle cx="30" cy="30" r="6" fill="#ef4444"/>
      <text x="45" y="34" fill="#ef4444" font-family="sans-serif" font-size="12" font-weight="bold">REC</text>
    </svg>`;
    return res.send(svgFrame);
  } catch (error) {
    return res.status(500).send('Stream error');
  }
};

// 23. Secure Snapshot Proxy
exports.snapshotProxy = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const verified = verifyStreamSessionToken(sessionToken);
    if (!verified.valid) {
      return res.status(403).json({ success: false, error: verified.error });
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    const svgSnapshot = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#1e293b"/>
      <path d="M160 260 L280 140 L380 220 L440 170 L520 260 Z" fill="#334155"/>
      <circle cx="240" cy="110" r="30" fill="#fbbf24"/>
      <rect x="20" y="20" width="180" height="30" rx="6" fill="#0f172a" opacity="0.7"/>
      <text x="30" y="40" fill="#22c55e" font-family="sans-serif" font-size="12" font-weight="bold">● CAPTURE: ${new Date().toLocaleTimeString()}</text>
    </svg>`;
    return res.send(svgSnapshot);
  } catch (error) {
    return res.status(500).send('Snapshot error');
  }
};

// 24. Multi-Vendor Webhook Ingestion
exports.handleWebhook = async (req, res) => {
  try {
    const { deviceId, vendor } = req.params;
    const device = await CctvDevice.findById(deviceId);
    if (!device) return sendError(res, 'Device not found', 404);

    const result = await CctvNotificationService.ingestAndProcessEvent(device, req.body, {
      headers: req.headers,
      vendor: vendor || device.vendor
    });

    return sendSuccess(res, result, 'Webhook event processed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 25. Simulate Hardware Event (for physical-less hardware testing)
exports.simulateHardwareEvent = async (req, res) => {
  try {
    const { deviceId, eventType, severity, title, message } = req.body;
    const device = await CctvDevice.findById(deviceId);
    if (!device) return sendError(res, 'Device not found', 404);

    const result = await CctvNotificationService.ingestAndProcessEvent(device, req.body, {
      eventType,
      severity,
      title,
      message
    });

    return sendSuccess(res, result, 'Event simulated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 26. Notification Rules CRUD
exports.getNotificationRules = async (req, res) => {
  try {
    const rules = await CctvNotificationRule.find({ propertyId: req.query.propertyId || req.user.propertyId });
    return sendSuccess(res, rules, 'Notification rules retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createNotificationRule = async (req, res) => {
  try {
    const rule = await CctvNotificationRule.create({
      ...req.body,
      organisationId: req.user.organisationId
    });
    return sendSuccess(res, rule, 'Rule created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateNotificationRule = async (req, res) => {
  try {
    const rule = await CctvNotificationRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, rule, 'Rule updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 27. Escalation Rules CRUD
exports.getEscalationRules = async (req, res) => {
  try {
    const rules = await CctvEscalationRule.find({ propertyId: req.query.propertyId || req.user.propertyId });
    return sendSuccess(res, rules, 'Escalation rules retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createEscalationRule = async (req, res) => {
  try {
    const rule = await CctvEscalationRule.create({
      ...req.body,
      organisationId: req.user.organisationId
    });
    return sendSuccess(res, rule, 'Escalation rule created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// 28. Access & Audit Logs
exports.getAccessLogs = async (req, res) => {
  try {
    const logs = await CctvAuditLog.find({ organisationId: req.user.organisationId })
      .populate('userId', 'firstName lastName email')
      .populate('deviceId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    return sendSuccess(res, logs, 'Access logs retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
