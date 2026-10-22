const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const logAudit = async (req, { action, module, recordId = '', oldData = null, newData = null, status = 'SUCCESS' }) => {
  try {
    await AuditLog.create({
      userId: req.user ? req.user._id : null,
      userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
      userEmail: req.user ? req.user.email : '',
      organisationId: req.currentOrganisationId || (req.user ? req.user.organisationId : null),
      propertyId: req.currentPropertyId || (req.user ? req.user.propertyId : null),
      action,
      module,
      recordId: recordId ? recordId.toString() : '',
      oldData,
      newData,
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      status
    });
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`);
  }
};

module.exports = { logAudit };
