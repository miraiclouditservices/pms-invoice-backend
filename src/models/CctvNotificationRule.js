const mongoose = require('mongoose');

const cctvNotificationRuleSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  propertyType: {
    type: String,
    required: true,
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'],
    index: true
  },

  ruleName: { type: String, required: true },
  description: { type: String, default: '' },
  
  targetZones: [{ type: String }],
  targetCameras: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice' }],
  eventTypes: [{ type: String }],
  minSeverity: {
    type: String,
    enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },

  // Deduplication & Throttling
  cooldownSeconds: { type: Number, default: 30 },
  aggregationWindowSeconds: { type: Number, default: 60 },

  // Quiet Hours configuration
  quietHoursEnabled: { type: Boolean, default: false },
  quietHoursStart: { type: String, default: '22:00' }, // HH:mm format
  quietHoursEnd: { type: String, default: '06:00' },
  exemptSeverities: [{ type: String, default: ['CRITICAL', 'HIGH'] }],

  // Role-based Delivery Matrix
  allowedRoles: [{ type: String }],
  
  // PropertyType-Specific Permissions
  // In Residential: Residents only get main gate / visitor gate alerts unless given explicit permission
  allowResidentsPublicFeeds: { type: Boolean, default: true },
  allowResidentsPrivateFeeds: { type: Boolean, default: false },

  // In Commercial: Leased floor/unit zone matching
  tenantIsolationEnabled: { type: Boolean, default: true },

  // In Coworking: Member shared vs private cabin isolation
  memberCabinIsolationEnabled: { type: Boolean, default: true },

  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvNotificationRule', cctvNotificationRuleSchema);
