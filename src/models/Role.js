const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  roleName: { type: String, required: true, trim: true },
  roleCode: { type: String, required: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true },
  propertyType: { 
    type: String, 
    enum: ['ALL', 'RESIDENTIAL', 'COMMERCIAL', 'COWORKING'], 
    default: 'ALL' 
  },
  scopeType: { 
    type: String, 
    enum: ['PLATFORM', 'ORGANISATION', 'PROPERTY', 'BUILDING', 'FLOOR', 'UNIT', 'DEPARTMENT'], 
    default: 'ORGANISATION' 
  },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  isSystemRole: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
