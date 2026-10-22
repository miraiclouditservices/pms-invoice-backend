const mongoose = require('mongoose');

const occupancySchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },

  occupancyCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  propertyType: { 
    type: String, 
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'], 
    required: true, 
    index: true 
  },

  // Occupant Identification
  occupantType: { 
    type: String, 
    required: true,
    index: true
  },
  occupantName: { type: String, required: true, trim: true },
  companyName: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  mobile: { type: String, default: '', trim: true },

  // Entity Relationships
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  tenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  coworkingMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Contract & Spatial Allocation Bindings
  contractAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractAgreement', default: null },
  allocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Allocation', default: null },

  // Financials & Charges
  monthlyAmount: { type: Number, default: 0 },
  camCharges: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  billingCycle: { type: String, default: 'MONTHLY' },
  paymentDueDate: { type: Number, default: 5 },

  // Timeline
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  moveInDate: { type: Date, default: null },
  moveOutDate: { type: Date, default: null },

  // Lifecycle Progress & Validation Gates
  agreementVerified: { type: Boolean, default: false },
  allocationVerified: { type: Boolean, default: false },
  accountVerified: { type: Boolean, default: false },

  allocationStatus: { 
    type: String, 
    enum: ['PENDING', 'ALLOCATED', 'RELEASED', 'RESERVED'], 
    default: 'PENDING' 
  },
  accountStatus: { 
    type: String, 
    enum: ['PENDING_INVITATION', 'INVITED', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DEACTIVATED'], 
    default: 'PENDING_INVITATION' 
  },
  agreementStatus: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
    default: 'ACTIVE'
  },
  status: { 
    type: String, 
    enum: [
      'DRAFT', 
      'PENDING_APPROVAL', 
      'AGREEMENT_PENDING', 
      'ALLOCATION_PENDING', 
      'ACCOUNT_PENDING', 
      'ACTIVE', 
      'SUSPENDED', 
      'EXPIRED', 
      'TERMINATED', 
      'CANCELLED'
    ], 
    default: 'DRAFT',
    index: true 
  },

  notes: { type: String, default: '' },
  auditLog: [{
    action: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    remarks: { type: String }
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Occupancy', occupancySchema);
