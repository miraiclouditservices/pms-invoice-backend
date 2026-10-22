const mongoose = require('mongoose');

const cctvNotificationSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  unitOrSpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  zoneId: { type: String, default: 'COMMON_AREA' },

  cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvEvent', default: null },

  recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  recipientRoleId: { type: String, default: null },

  eventType: { type: String, required: true, index: true },
  severity: {
    type: String,
    enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true
  },

  title: { type: String, required: true },
  message: { type: String, required: true },
  eventTime: { type: Date, required: true, default: Date.now },
  receivedTime: { type: Date, required: true, default: Date.now },

  snapshotUrl: { type: String, default: '' },
  videoClipUrl: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: { type: Number, default: 1.0 },

  status: {
    type: String,
    enum: ['UNREAD', 'READ', 'ACKNOWLEDGED', 'RESOLVED', 'REOPENED'],
    default: 'UNREAD',
    index: true
  },

  readAt: { type: Date, default: null },
  
  // Acknowledgement tracking
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedByName: { type: String, default: '' },
  acknowledgedAt: { type: Date, default: null },
  acknowledgementNotes: { type: String, default: '' },

  // Resolution tracking
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedByName: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  resolutionNotes: { type: String, default: '' },

  // Reopen tracking
  reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reopenedByName: { type: String, default: '' },
  reopenedAt: { type: Date, default: null },
  reopenReason: { type: String, default: '' },

  // Escalation tracking
  escalationLevel: { type: Number, default: 1 },
  escalatedAt: { type: Date, default: null },
  escalationHistory: [{
    level: { type: Number },
    roleTargeted: { type: String },
    notifiedAt: { type: Date, default: Date.now },
    reason: { type: String }
  }],

  // Repeated Event Aggregation count
  aggregatedCount: { type: Number, default: 1 },
  requiresAcknowledgement: { type: Boolean, default: false },
  deepLink: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvNotification', cctvNotificationSchema);
