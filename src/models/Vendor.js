const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  
  vendorCode: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['HVAC', 'ELECTRICAL', 'PLUMBING', 'ELEVATOR', 'SECURITY', 'HOUSEKEEPING', 'LANDSCAPING', 'PEST_CONTROL', 'FIRE_SAFETY', 'OTHER'],
    required: true 
  },
  
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' }
  },
  
  rating: { type: Number, default: 4.5, min: 1, max: 5 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'], default: 'ACTIVE' },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
