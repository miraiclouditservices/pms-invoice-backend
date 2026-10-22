const mongoose = require('mongoose');

const amcContractSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  amcNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  
  contractStartDate: { type: Date, required: true },
  contractEndDate: { type: Date, required: true, index: true },
  contractAmount: { type: Number, required: true },
  
  serviceFrequency: { 
    type: String, 
    enum: ['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'HALFYEARLY', 'ANNUALLY'], 
    default: 'QUARTERLY' 
  },
  
  slaResponseHours: { type: Number, default: 4 },
  renewalReminderDate: { type: Date, default: null },
  termsAndConditions: { type: String, default: 'Covers routine inspections, emergency breakdown repairs, and standard consumables.' },
  documentUrl: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED'], 
    default: 'ACTIVE',
    index: true 
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('AMCContract', amcContractSchema);
