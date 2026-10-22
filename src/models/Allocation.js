const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },

  allocationCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  propertyType: { type: String, enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'], required: true },

  // Allocation Classification
  allocationType: { 
    type: String, 
    enum: ['PERMANENT', 'TEMPORARY', 'SHARED', 'PRIMARY', 'SECONDARY', 'RESERVED', 'TRIAL', 'GUEST'], 
    default: 'PERMANENT',
    index: true
  },

  // Occupant Target
  occupantType: { type: String, required: true },
  occupantName: { type: String, required: true },
  companyName: { type: String, default: '' },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  tenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  coworkingMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  contractAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractAgreement', default: null },

  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  releasedDate: { type: Date, default: null },

  // Specs & Allocations
  accessLevel: { type: String, default: 'Standard' },
  parkingSlots: [{ type: String }],
  allocatedAreaSqFt: { type: Number, default: 0 },
  seatsAllocated: { type: Number, default: 1 },

  status: { 
    type: String, 
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'RELEASED', 'EXPIRED'], 
    default: 'ACTIVE',
    index: true 
  },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Allocation', allocationSchema);
