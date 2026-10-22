const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  propertyType: { 
    type: String, 
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'], 
    default: 'RESIDENTIAL',
    index: true 
  },
  propertyName: { type: String, default: '' },
  
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  buildingName: { type: String, default: '' },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  floorName: { type: String, default: '' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  unitNumber: { type: String, default: '' },
  
  passCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  visitorNumber: { type: String, default: '' },
  visitorName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  visitorPhoto: { type: String, default: '' },
  
  visitorType: { 
    type: String, 
    enum: [
      'GUEST', 'FAMILY_VISITOR', 'DELIVERY', 'DOMESTIC_HELP', 'CAB_DRIVER', 
      'SERVICE_TECHNICIAN', 'VENDOR', 'EMERGENCY_VISITOR', 'EVENT_VISITOR', 'TEMPORARY_RESIDENT',
      'CLIENT', 'BUSINESS_GUEST', 'INTERVIEW_CANDIDATE', 'COURIER', 'SERVICE_ENGINEER', 'CONTRACTOR', 'EMPLOYEE_GUEST', 'MEETING_VISITOR',
      'MEETING_GUEST', 'EVENT_GUEST', 'SERVICE_PROVIDER', 'TRAINING_PARTICIPANT', 'TEMPORARY_MEMBER', 'COMPANY_GUEST'
    ], 
    default: 'GUEST',
    index: true 
  },
  
  purpose: { type: String, default: 'Personal Visit' },
  numberOfVisitors: { type: Number, default: 1 },
  accompanyingVisitors: [{ type: String }],
  
  hostType: { 
    type: String, 
    enum: ['RESIDENT', 'TENANT_EMPLOYEE', 'TENANT_ADMIN', 'COWORKING_MEMBER', 'OFFICE_ADMIN', 'SECURITY'],
    default: 'RESIDENT'
  },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  hostName: { type: String, default: '' },
  hostMobile: { type: String, default: '' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  companyName: { type: String, default: '' },
  
  expectedDate: { type: Date, default: Date.now, index: true },
  expectedTime: { type: String, default: '12:00' },
  expectedExitTime: { type: String, default: '18:00' },
  actualArrivalTime: { type: String, default: '' },
  
  vehicleType: { 
    type: String, 
    enum: ['TWO_WHEELER', 'CAR', 'TAXI', 'COMMERCIAL_VEHICLE', 'BICYCLE', 'OTHER', 'NONE'],
    default: 'NONE'
  },
  vehicleNumber: { type: String, default: '' },
  parkingRequired: { type: Boolean, default: false },
  parkingSlot: { type: String, default: '' },
  driverName: { type: String, default: '' },
  
  idProofType: { 
    type: String, 
    enum: ['AADHAAR', 'DRIVING_LICENSE', 'PASSPORT', 'EMPLOYEE_ID', 'VOTER_ID', 'OTHER'],
    default: 'AADHAAR' 
  },
  idProofNumber: { type: String, default: '' }, // Last 4 digits or masked
  
  hostApprovalStatus: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'NOT_REQUIRED'], 
    default: 'APPROVED',
    index: true 
  },
  approvalBy: { type: String, default: '' },
  approvalAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  
  gatePassType: {
    type: String,
    enum: ['ONE_TIME', 'RECURRING', 'DAILY', 'EMPLOYEE_GUEST', 'DELIVERY', 'VENDOR', 'EVENT', 'EMERGENCY'],
    default: 'ONE_TIME'
  },
  gatePassStatus: {
    type: String,
    enum: ['GENERATED', 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED', 'COMPLETED'],
    default: 'GENERATED'
  },
  qrCodeUrl: { type: String, default: '' },
  allowedGates: [{ type: String }],
  allowedAreas: [{ type: String }],
  
  checkInGate: { type: String, default: '' },
  checkOutGate: { type: String, default: '' },
  checkInTime: { type: Date, default: null },
  checkOutTime: { type: Date, default: null },
  visitDuration: { type: String, default: '' },
  
  isOverstay: { type: Boolean, default: false },
  overstayDuration: { type: String, default: '' },
  
  securityRemarks: { type: String, default: '' },
  denialReason: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'DENIED', 'OVERSTAY'], 
    default: 'EXPECTED',
    index: true 
  },
  
  checkedInBySecurityId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  checkedOutBySecurityId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Visitor', visitorSchema);
