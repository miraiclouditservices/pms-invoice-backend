const CctvNotification = require('../../models/CctvNotification');
const CctvEscalationRule = require('../../models/CctvEscalationRule');
const CctvAuditLog = require('../../models/CctvAuditLog');
const { getIO } = require('../../sockets/socketManager');
const logger = require('../../config/logger');

class CctvEscalationService {
  /**
   * Check and escalate unacknowledged high/critical notifications
   */
  static async processEscalations() {
    try {
      const pendingNotifications = await CctvNotification.find({
        status: 'UNREAD',
        requiresAcknowledgement: true,
        severity: { $in: ['HIGH', 'CRITICAL', 'MEDIUM'] }
      }).populate('cameraId');

      const now = Date.now();

      for (const notif of pendingNotifications) {
        const minutesSinceCreated = (now - new Date(notif.createdAt).getTime()) / (60 * 1000);

        // Find applicable escalation rule
        const rule = await CctvEscalationRule.findOne({
          propertyId: notif.propertyId,
          isActive: true
        });

        if (!rule || !rule.levels || rule.levels.length === 0) continue;

        const currentLevelIndex = (notif.escalationLevel || 1) - 1;
        const currentRuleLevel = rule.levels[currentLevelIndex];

        if (currentRuleLevel && minutesSinceCreated >= currentRuleLevel.timeoutMinutes) {
          const nextLevelIndex = currentLevelIndex + 1;
          if (nextLevelIndex < rule.levels.length) {
            const nextLevel = rule.levels[nextLevelIndex];

            notif.escalationLevel = nextLevel.level;
            notif.escalatedAt = new Date();
            notif.escalationHistory.push({
              level: nextLevel.level,
              roleTargeted: nextLevel.roleTargeted,
              notifiedAt: new Date(),
              reason: `Unacknowledged for ${Math.round(minutesSinceCreated)} mins by Level ${currentRuleLevel.level}`
            });

            await notif.save();

            // Record in audit log
            await CctvAuditLog.create({
              organisationId: notif.organisationId,
              propertyId: notif.propertyId,
              action: 'ALERT_ESCALATED',
              notificationId: notif._id,
              deviceId: notif.cameraId?._id || notif.cameraId,
              details: {
                previousLevel: currentRuleLevel.level,
                newLevel: nextLevel.level,
                roleTargeted: nextLevel.roleTargeted,
                minutesElapsed: Math.round(minutesSinceCreated)
              }
            });

            // Emit real-time escalation event via Socket.IO
            const io = getIO();
            if (io) {
              io.to(`property:${notif.propertyId}`).emit('cctv.notification.updated', {
                notificationId: notif._id,
                status: notif.status,
                escalationLevel: notif.escalationLevel,
                escalatedToRole: nextLevel.roleTargeted
              });
            }

            logger.warn(`[CCTV Escalation] Alert ${notif._id} escalated to Level ${nextLevel.level} (${nextLevel.roleTargeted})`);
          }
        }
      }
    } catch (err) {
      logger.error('Error processing CCTV escalations: %o', err);
    }
  }
}

module.exports = CctvEscalationService;
