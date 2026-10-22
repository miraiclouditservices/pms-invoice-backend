const CctvAuditLog = require('../../models/CctvAuditLog');
const logger = require('../../config/logger');

class CctvAuditService {
  /**
   * Record a tamper-evident audit log entry
   * @param {object} params
   * @param {string} params.action
   * @param {object} [params.user] - req.user
   * @param {string} [params.deviceId]
   * @param {string} [params.notificationId]
   * @param {string} [params.propertyId]
   * @param {string} [params.organisationId]
   * @param {object} [params.details]
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   */
  static async logAction(params) {
    try {
      const user = params.user || {};
      const auditEntry = await CctvAuditLog.create({
        action: params.action,
        userId: user._id || null,
        userEmail: user.email || 'SYSTEM',
        userRole: user.primaryRole || 'SYSTEM_DAEMON',
        deviceId: params.deviceId || null,
        notificationId: params.notificationId || null,
        propertyId: params.propertyId || user.propertyId || null,
        organisationId: params.organisationId || user.organisationId || null,
        details: params.details || {},
        ipAddress: params.ipAddress || '',
        userAgent: params.userAgent || ''
      });

      return auditEntry;
    } catch (err) {
      logger.error('Failed to write CCTV audit log: %o', err);
    }
  }
}

module.exports = CctvAuditService;
