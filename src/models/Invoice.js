const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  invoiceType: { 
    type: String, 
    enum: ['MAINTENANCE', 'RENT', 'CAM', 'COWORKING_MEMBERSHIP', 'BOOKING', 'UTILITY', 'PARKING', 'OTHER'], 
    default: 'MAINTENANCE' 
  },
  
  // Beneficiary target
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  tenantCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantCompany', default: null },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  leaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'AggregateLease', default: null },
  
  billingPeriod: { type: String, required: true }, // e.g., "September 2026"
  billingDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true, index: true },
  
  items: [{
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  
  subtotal: { type: Number, required: true },
  taxPercent: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, required: true },
  
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'], 
    default: 'PENDING',
    index: true 
  },
  
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
