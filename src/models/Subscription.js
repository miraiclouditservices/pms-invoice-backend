const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  planName: { type: String, required: true, trim: true },
  planCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  propertyTypesAllowed: [{ 
    type: String, 
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'] 
  }],
  maxProperties: { type: Number, default: 5 },
  maxBuildings: { type: Number, default: 10 },
  maxUnits: { type: Number, default: 200 },
  maxUsers: { type: Number, default: 100 },
  storageLimitGB: { type: Number, default: 10 },
  modulesIncluded: [{ type: String }],
  
  monthlyPrice: { type: Number, required: true, default: 0 },
  yearlyPrice: { type: Number, required: true, default: 0 },
  setupFee: { type: Number, default: 0 },
  trialDays: { type: Number, default: 14 },
  
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
