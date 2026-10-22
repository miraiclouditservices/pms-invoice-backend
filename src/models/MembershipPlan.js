const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
  
  planName: { type: String, required: true, trim: true },
  planType: { 
    type: String, 
    enum: ['HOT_DESK', 'DEDICATED_DESK', 'PRIVATE_CABIN', 'VIRTUAL_OFFICE', 'FLEXI_PASS'], 
    required: true 
  },
  
  monthlyPrice: { type: Number, required: true },
  quarterlyPrice: { type: Number, default: 0 },
  yearlyPrice: { type: Number, default: 0 },
  
  includedSeats: { type: Number, default: 1 },
  includedHours: { type: Number, default: 160 },
  meetingRoomCreditsHours: { type: Number, default: 10 },
  printingCreditsPages: { type: Number, default: 100 },
  
  accessTiming: { type: String, default: '24/7 Access' },
  extraSeatPriceMonthly: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 18 },
  
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
