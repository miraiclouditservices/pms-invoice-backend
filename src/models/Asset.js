const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  
  assetCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  assetName: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['HVAC', 'ELEVATOR', 'GENERATOR', 'FIRE_SAFETY', 'CCTV_SECURITY', 'WATER_PUMP', 'IT_NETWORK', 'FURNITURE', 'OTHER'], 
    required: true 
  },
  location: { type: String, default: '' },
  
  purchaseDate: { type: Date, default: null },
  purchaseCost: { type: Number, default: 0 },
  warrantyExpiry: { type: Date, default: null },
  
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  amcContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCContract', default: null },
  
  serviceFrequencyDays: { type: Number, default: 90 },
  lastServiceDate: { type: Date, default: null },
  nextServiceDate: { type: Date, default: null, index: true },
  
  condition: { 
    type: String, 
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'CRITICAL'], 
    default: 'GOOD' 
  },
  status: { type: String, enum: ['OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'], default: 'OPERATIONAL' },
  
  assignedTechnician: { type: String, default: '' },
  notes: { type: String, default: '' },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Asset', assetSchema);
