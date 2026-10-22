const mongoose = require('mongoose');

const aggregateLeaseSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  tenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', required: true, index: true },
  
  masterLeaseNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  
  // Aggregate multi-unit and multi-floor bindings
  buildingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Building' }],
  floorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Floor' }],
  unitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true }],
  
  leaseStartDate: { type: Date, required: true },
  leaseEndDate: { type: Date, required: true },
  handoverDate: { type: Date, default: Date.now },
  lockInPeriodMonths: { type: Number, default: 12 },
  noticePeriodMonths: { type: Number, default: 3 },
  
  // Financial terms
  monthlyBaseRent: { type: Number, required: true },
  camCharges: { type: Number, default: 0 }, // Common Area Maintenance
  utilityCharges: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 18 },
  totalMonthlyPayable: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  rentEscalationPercent: { type: Number, default: 5 }, // Yearly escalation
  paymentFrequency: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'ANNUALLY'], default: 'MONTHLY' },
  
  renewalTerms: { type: String, default: 'Standard 5% escalation on annual renewal.' },
  terminationTerms: { type: String, default: '3 months advance written notice or equivalent rent in lieu.' },
  documents: [{
    title: { type: String },
    fileUrl: { type: String }
  }],
  
  approvalStatus: { 
    type: String, 
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], 
    default: 'APPROVED' 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'TERMINATED', 'UPCOMING'], 
    default: 'ACTIVE',
    index: true 
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('AggregateLease', aggregateLeaseSchema);
