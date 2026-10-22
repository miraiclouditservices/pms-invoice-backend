const mongoose = require('mongoose');

const escalationLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  roleTargeted: { type: String, required: true },
  timeoutMinutes: { type: Number, required: true, default: 5 },
  notifyEmail: { type: Boolean, default: false },
  notifySms: { type: Boolean, default: false },
  notifyPush: { type: Boolean, default: true },
  notifyWhatsApp: { type: Boolean, default: false }
}, { _id: false });

const cctvEscalationRuleSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  propertyType: {
    type: String,
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'],
    required: true
  },
  
  zoneId: { type: String, default: null },
  cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', default: null },
  eventTypes: [{ type: String }],
  minSeverity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },

  ruleName: { type: String, required: true },
  isActive: { type: Boolean, default: true },

  // Escalation Levels
  levels: [escalationLevelSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvEscalationRule', cctvEscalationRuleSchema);
