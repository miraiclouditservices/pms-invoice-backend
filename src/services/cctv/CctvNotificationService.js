const CctvEvent = require('../../models/CctvEvent');
const CctvNotification = require('../../models/CctvNotification');
const CctvNotificationRule = require('../../models/CctvNotificationRule');
const CctvDevice = require('../../models/CctvDevice');
const User = require('../../models/User');
const { CctvEventNormalizerService } = require('./CctvEventNormalizerService');
const CctvDeduplicationService = require('./CctvDeduplicationService');
const CctvPermissionService = require('./CctvPermissionService');
const CctvPushService = require('./CctvPushService');
const CctvAuditService = require('./CctvAuditService');
const { getIO } = require('../../sockets/socketManager');
const logger = require('../../config/logger');

class CctvNotificationService {
  /**
   * Complete Ingestion & Processing Pipeline
   * @param {object} device - CctvDevice doc
   * @param {object|string} rawPayload - Raw incoming payload from webhook or polling
   * @param {object} [options] - headers, override eventType, severity, etc.
   */
  static async ingestAndProcessEvent(device, rawPayload, options = {}) {
    try {
      // 1. Normalize Event
      const normalized = await CctvEventNormalizerService.normalizeEvent(device, rawPayload, options);

      // 2. Save Raw Normalized Event in Database
      const eventDoc = await CctvEvent.create(normalized);

      // 3. Deduplication & Repeated-Event Aggregation
      const dedupResult = CctvDeduplicationService.processDeduplication(normalized);

      if (!dedupResult.shouldNotify) {
        eventDoc.status = 'DEDUPLICATED';
        await eventDoc.save();
        return { success: true, status: 'DEDUPLICATED', count: dedupResult.aggregatedCount };
      }

      const finalTitle = dedupResult.isAggregated ? dedupResult.customTitle : normalized.title;
      const finalMessage = dedupResult.isAggregated ? dedupResult.customMessage : normalized.message;

      // 4. Check Notification Rules & Quiet Hours
      const activeRules = await CctvNotificationRule.find({
        propertyId: device.propertyId,
        isActive: true
      });

      let skipNotification = false;
      const currentHourMin = new Date().toTimeString().slice(0, 5);

      for (const rule of activeRules) {
        if (rule.quietHoursEnabled) {
          const isQuietHour = (currentHourMin >= rule.quietHoursStart || currentHourMin <= rule.quietHoursEnd);
          if (isQuietHour && !rule.exemptSeverities.includes(normalized.severity)) {
            skipNotification = true;
            logger.info(`[CCTV Rule] Notification suppressed by quiet hours (${rule.quietHoursStart}-${rule.quietHoursEnd})`);
            break;
          }
        }
      }

      if (skipNotification) {
        eventDoc.status = 'NOTIFIED';
        await eventDoc.save();
        return { success: true, status: 'QUIET_HOURS_SUPPRESSED' };
      }

      // 5. Query candidate recipients in the property
      const users = await User.find({
        organisationId: device.organisationId,
        status: 'ACTIVE'
      });

      const notificationsCreated = [];
      const recipientUserIds = [];

      for (const user of users) {
        // Enforce strict PropertyType and role permissions
        const hasAccess = await CctvPermissionService.canAccessCamera(user, device, {
          zoneId: normalized.zoneId,
          unitOrSpaceId: normalized.unitOrSpaceId
        });

        if (hasAccess) {
          const notif = await CctvNotification.create({
            organisationId: device.organisationId,
            propertyId: device.propertyId,
            buildingId: normalized.buildingId,
            floorId: normalized.floorId,
            unitOrSpaceId: normalized.unitOrSpaceId,
            zoneId: normalized.zoneId,
            cameraId: device._id,
            eventId: eventDoc._id,
            recipientUserId: user._id,
            recipientRoleId: user.primaryRole,
            eventType: normalized.eventType,
            severity: normalized.severity,
            title: finalTitle,
            message: finalMessage,
            eventTime: normalized.eventTime,
            receivedTime: normalized.receivedTime,
            snapshotUrl: normalized.snapshotUrl,
            videoClipUrl: normalized.videoClipUrl,
            metadata: normalized.metadata,
            confidence: normalized.confidence,
            status: 'UNREAD',
            aggregatedCount: dedupResult.aggregatedCount,
            requiresAcknowledgement: ['HIGH', 'CRITICAL'].includes(normalized.severity),
            deepLink: `/cctv/alert/${eventDoc._id}`
          });

          notificationsCreated.push(notif);
          recipientUserIds.push(String(user._id));
        }
      }

      eventDoc.status = 'NOTIFIED';
      await eventDoc.save();

      // 6. Real-time Socket.IO emission to secure rooms
      const io = getIO();
      if (io) {
        const socketPayload = {
          notificationId: notificationsCreated[0]?._id,
          eventId: eventDoc._id,
          cameraId: device._id,
          cameraName: device.name,
          propertyId: device.propertyId,
          zoneId: normalized.zoneId,
          eventType: normalized.eventType,
          severity: normalized.severity,
          title: finalTitle,
          message: finalMessage,
          eventTime: normalized.eventTime,
          snapshotUrl: normalized.snapshotUrl,
          requiresAcknowledgement: ['HIGH', 'CRITICAL'].includes(normalized.severity),
          aggregatedCount: dedupResult.aggregatedCount
        };

        // Emit to Property room
        io.to(`property:${device.propertyId}`).emit('cctv.notification.created', socketPayload);
        // Emit to Zone room
        io.to(`zone:${normalized.zoneId}`).emit('cctv.notification.created', socketPayload);
        // Emit to Camera room
        io.to(`camera:${device._id}`).emit('cctv.notification.created', socketPayload);
      }

      // 7. Dispatch Push Notifications
      if (notificationsCreated.length > 0) {
        await CctvPushService.sendPushNotification({
          notificationId: notificationsCreated[0]._id,
          eventType: normalized.eventType,
          severity: normalized.severity,
          propertyId: device.propertyId,
          cameraId: device._id,
          title: finalTitle,
          body: finalMessage,
          deepLink: `/cctv/alert/${notificationsCreated[0]._id}`,
          requiresAcknowledgement: ['HIGH', 'CRITICAL'].includes(normalized.severity),
          recipientUserIds
        });
      }

      // 8. Audit Logging
      await CctvAuditService.logAction({
        action: 'ALERT_INGESTED',
        deviceId: device._id,
        notificationId: notificationsCreated[0]?._id,
        propertyId: device.propertyId,
        organisationId: device.organisationId,
        details: {
          eventType: normalized.eventType,
          severity: normalized.severity,
          recipientsCount: notificationsCreated.length,
          aggregatedCount: dedupResult.aggregatedCount
        }
      });

      return {
        success: true,
        status: 'PROCESSED',
        notificationsCreated: notificationsCreated.length,
        aggregatedCount: dedupResult.aggregatedCount
      };
    } catch (err) {
      logger.error('Error in CCTV Notification Ingestion Pipeline: %o', err);
      throw err;
    }
  }
}

module.exports = CctvNotificationService;
