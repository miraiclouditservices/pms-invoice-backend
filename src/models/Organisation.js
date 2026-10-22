const mongoose = require('mongoose');

const organisationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  type: { 
    type: String, 
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING', 'MIXED'], 
    default: 'RESIDENTIAL' 
  },
  logo: { type: String, default: '' },
  primaryContactName: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'India' },
  pincode: { type: String, default: '' },
  
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  website: { type: String, default: '' },
  
  subscriptionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  subscriptionStartDate: { type: Date, default: Date.now },
  subscriptionEndDate: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  
  maxProperties: { type: Number, default: 5 },
  maxUsers: { type: Number, default: 100 },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'TRIAL'], 
    default: 'ACTIVE',
    index: true 
  },
  notes: { type: String, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organisation', organisationSchema);
