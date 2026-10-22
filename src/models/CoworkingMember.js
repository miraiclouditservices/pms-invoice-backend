const mongoose = require('mongoose');

const coworkingMemberSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  memberName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  
  companyName: { type: String, default: '' },
  isCompanyAdmin: { type: Boolean, default: false },
  
  membershipPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
  assignedUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null }, // desk or private cabin
  
  availableMeetingCreditsHours: { type: Number, default: 10 },
  availablePrintingCredits: { type: Number, default: 100 },
  
  joiningDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  accessCardNumber: { type: String, default: '' },
  kycVerified: { type: Boolean, default: false },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'], 
    default: 'ACTIVE',
    index: true 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('CoworkingMember', coworkingMemberSchema);
