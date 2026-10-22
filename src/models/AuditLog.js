const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  userName: { type: String, default: 'System' },
  userEmail: { type: String, default: '' },
  
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  
  action: { type: String, required: true }, // e.g. "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE"
  module: { type: String, required: true }, // e.g. "ORGANISATION", "LEASE", "BOOKING", "AUTH"
  recordId: { type: String, default: '' },
  
  oldData: { type: mongoose.Schema.Types.Mixed, default: null },
  newData: { type: mongoose.Schema.Types.Mixed, default: null },
  
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  status: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
