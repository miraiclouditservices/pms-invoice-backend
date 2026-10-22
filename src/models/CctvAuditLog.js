const mongoose = require('mongoose');

const cctvAuditLogSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String, default: '' },
  userRole: { type: String, default: '' },

  action: {
    type: String,
    required: true,
    enum: [
      'DEVICE_REGISTERED',
      'DEVICE_UPDATED',
      'CREDENTIALS_ROTATED',
      'CONNECTION_TESTED',
      'CAPABILITIES_SCANNED',
      'CHANNELS_MAPPED',
      'ALERT_INGESTED',
      'ALERT_ACKNOWLEDGED',
      'ALERT_RESOLVED',
      'ALERT_REOPENED',
      'ALERT_ESCALATED',
      'LIVE_STREAM_ACCESSED',
      'SNAPSHOT_VIEWED',
      'PLAYBACK_VIEWED',
      'PERMISSION_DENIED',
      'ERROR_RECOVERED'
    ],
    index: true
  },

  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', default: null },
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvNotification', default: null },
  
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvAuditLog', cctvAuditLogSchema);
