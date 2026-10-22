const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  
  // Common Identifiers
  unitNumber: { type: String, required: true, trim: true },
  unitCode: { type: String, trim: true, uppercase: true },
  unitName: { type: String, default: '', trim: true },
  wing: { type: String, default: '' },
  description: { type: String, default: '' },
  
  // Unified Unit/Space Type
  unitType: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Area Measurements
  carpetArea: { type: Number, default: 0 },
  builtUpArea: { type: Number, default: 0 },
  superBuiltUpArea: { type: Number, default: 0 },
  chargeableArea: { type: Number, default: 0 },
  rentableArea: { type: Number, default: 0 },
  
  // Capacity & Workstations
  capacity: { type: Number, default: 1 },
  seatingCapacity: { type: Number, default: 1 },
  workstationsCount: { type: Number, default: 0 },

  // Unified Status
  status: { 
    type: String, 
    enum: [
      'AVAILABLE', 'VACANT', 'OCCUPIED', 'RESERVED', 
      'UNDER_MAINTENANCE', 'BLOCKED', 'INACTIVE', 'ARCHIVED',
      'SOLD', 'RENTED'
    ], 
    default: 'VACANT',
    index: true 
  },
  occupancyStatus: { 
    type: String, 
    enum: ['VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'], 
    default: 'VACANT',
    index: true 
  },
  furnishingType: { type: String, enum: ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'], default: 'UNFURNISHED' },

  // A. APARTMENT / RESIDENTIAL SPECIFIC
  flatNumber: { type: String, default: '' },
  bhkType: { 
    type: String, 
    enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'PENTHOUSE', 'OTHER', ''], 
    default: '' 
  },
  facing: { 
    type: String, 
    enum: ['EAST', 'WEST', 'NORTH', 'SOUTH', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST', ''], 
    default: '' 
  },
  ownershipType: { 
    type: String, 
    enum: ['OWNER_OCCUPIED', 'RENTED', 'LEASED', 'BUILDER', ''], 
    default: '' 
  },
  ownerName: { type: String, default: '' },
  residentName: { type: String, default: '' },
  familyMembersCount: { type: Number, default: 0 },
  monthlyMaintenanceAmount: { type: Number, default: 0 },
  utilityMeters: {
    electricity: { type: String, default: '' },
    water: { type: String, default: '' },
    gas: { type: String, default: '' }
  },
  moveInDate: { type: Date, default: null },
  moveOutDate: { type: Date, default: null },

  // B. COMMERCIAL PROPERTY SPECIFIC
  officeShopNumber: { type: String, default: '' },
  commercialUnitType: { type: String, default: '' },
  tenantCompany: { type: String, default: '' },
  tenantContactPerson: { type: String, default: '' },
  tenantEmail: { type: String, default: '' },
  tenantPhone: { type: String, default: '' },
  businessCategory: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  leaseStartDate: { type: Date, default: null },
  leaseEndDate: { type: Date, default: null },
  lockInPeriodMonths: { type: Number, default: 0 },
  noticePeriodMonths: { type: Number, default: 0 },
  monthlyRent: { type: Number, default: 0 },
  camCharges: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  taxPercentage: { type: Number, default: 0 },
  escalationPercentage: { type: Number, default: 0 },
  rentDueDate: { type: Number, default: 1 },

  // C. CO-WORKING SPACE SPECIFIC
  spaceNumber: { type: String, default: '' },
  spaceCode: { type: String, default: '' },
  spaceName: { type: String, default: '' },
  spaceType: { type: String, default: '' },
  deskNumber: { type: String, default: '' },
  cabinNumber: { type: String, default: '' },
  officeNumber: { type: String, default: '' },
  hourlyPrice: { type: Number, default: 0 },
  dailyPrice: { type: Number, default: 0 },
  monthlyPrice: { type: Number, default: 0 },
  membershipPlan: { type: String, default: '' },
  assignedCompanyName: { type: String, default: '' },
  assignedMemberName: { type: String, default: '' },
  bookingRequired: { type: Boolean, default: false },
  approvalRequired: { type: Boolean, default: false },
  amenities: [{ type: String }],
  creditUsage: { type: Number, default: 0 },
  accessTiming: { type: String, default: '24/7' },
  internetAvailability: { type: Boolean, default: true },
  powerBackupAvailable: { type: Boolean, default: true },
  meetingRoomAccess: { type: Boolean, default: true },
  printingAccess: { type: Boolean, default: true },
  lockerAvailable: { type: Boolean, default: false },
  parkingAvailable: { type: Boolean, default: false },

  // Common Relations & Operations
  currentResidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  currentTenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  currentMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  parkingSlotsAllocated: [{ type: String }],
  
  assignedManager: { type: String, default: '' },
  accessLevel: { type: String, default: 'Standard' },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  notes: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  documents: [{
    title: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

unitSchema.index({ floorId: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.model('Unit', unitSchema);
