const mongoose = require('mongoose');

const contractAgreementSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null, index: true },
  occupancyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Occupancy', default: null, index: true },

  contractNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  contractType: { 
    type: String, 
    enum: [
      // Apartment / Residential
      'RENTAL_AGREEMENT', 
      'OWNER_OCCUPANCY_AGREEMENT', 
      'FAMILY_OCCUPANCY_AGREEMENT',
      'TEMPORARY_OCCUPANCY_AGREEMENT',
      'GUEST_RESIDENT_AGREEMENT',
      // Commercial
      'STANDARD_COMMERCIAL_LEASE', 
      'OFFICE_LEASE', 
      'RETAIL_LEASE', 
      'SHOP_LEASE', 
      'WAREHOUSE_LEASE', 
      'SHORT_TERM_LEASE', 
      'RENEWAL_LEASE', 
      'EXPANSION_LEASE',
      // Co-working
      'HOT_DESK_MEMBERSHIP', 
      'DEDICATED_DESK_MEMBERSHIP', 
      'PRIVATE_CABIN_AGREEMENT', 
      'DEDICATED_OFFICE_AGREEMENT', 
      'MEETING_ROOM_PACKAGE', 
      'VIRTUAL_OFFICE_AGREEMENT', 
      'SHORT_TERM_MEMBERSHIP', 
      'CORPORATE_MEMBERSHIP'
    ], 
    required: true,
    index: true 
  },

  // Linked Party
  partyType: { type: String, enum: ['RESIDENT', 'TENANT_COMPANY', 'COWORKING_MEMBER'], required: true },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  tenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  coworkingMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  ownerName: { type: String, default: '' },

  // Dates & Duration
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  lockInPeriodMonths: { type: Number, default: 0 },
  noticePeriodMonths: { type: Number, default: 1 },
  billingCycle: { 
    type: String, 
    enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], 
    default: 'MONTHLY' 
  },
  paymentDueDate: { type: Number, default: 5 }, // day of month

  // Financials
  baseRentOrFee: { type: Number, required: true, default: 0 },
  maintenanceAmount: { type: Number, default: 0 },
  camCharges: { type: Number, default: 0 },
  utilityCharges: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  taxPercentage: { type: Number, default: 0 },
  escalationPercentage: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  totalRecurringAmount: { type: Number, default: 0 },

  // Terms & Rights
  autoRenewal: { type: Boolean, default: false },
  renewalOption: { type: Boolean, default: true },
  utilityResponsibility: { type: String, default: 'TENANT' },
  fitOutPeriodDays: { type: Number, default: 0 },
  gracePeriodDays: { type: Number, default: 5 },

  // Coworking specific privileges
  includedHours: { type: Number, default: 0 },
  includedCredits: { type: Number, default: 0 },
  accessTiming: { type: String, default: '24/7' },
  meetingRoomAccess: { type: Boolean, default: false },
  lockerAccess: { type: Boolean, default: false },
  printingAccess: { type: Boolean, default: false },
  internetAccess: { type: Boolean, default: true },
  parkingAccess: { type: Boolean, default: false },

  // Documents & Approvals
  agreementDocumentUrl: { type: String, default: '' },
  documents: [{
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, default: 'application/pdf' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'SUPERSEDED', 'PENDING_SIGNATURE', 'EXPIRED'], 
      default: 'ACTIVE' 
    }
  }],
  approvalRequired: { type: Boolean, default: false },
  approvalStatus: { 
    type: String, 
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], 
    default: 'APPROVED' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },

  status: { 
    type: String, 
    enum: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED', 'CANCELLED'], 
    default: 'ACTIVE',
    index: true 
  },

  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContractAgreement', contractAgreementSchema);
