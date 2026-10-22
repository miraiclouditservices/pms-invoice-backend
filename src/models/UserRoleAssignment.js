const mongoose = require('mongoose');

const userRoleAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  buildingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Building' }],
  floorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Floor' }],
  unitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
  
  permissionOverrides: [{
    permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    granted: { type: Boolean, default: true } // true = allow, false = deny
  }],

  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'REVOKED'], default: 'ACTIVE' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserRoleAssignment', userRoleAssignmentSchema);
