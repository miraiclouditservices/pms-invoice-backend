const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, uppercase: true, trim: true, required: true },
  
  buildingType: {
    type: String,
    enum: [
      // Apartment / Residential
      'TOWER', 'BLOCK', 'VILLA_BLOCK',
      // Commercial
      'MAIN_BUILDING', 'WING', 'ANNEX', 'RETAIL_BLOCK',
      // Coworking
      'WORKSPACE_CENTRE', 'BUILDING', 'CENTRE_WING', 'DEDICATED_ZONE'
    ],
    default: 'BLOCK',
    index: true
  },
  
  description: { type: String, default: '' },
  buildingImageUrl: { type: String, default: '' },
  address: { type: String, default: '' },
  wings: [{ type: String }],
  
  // Floor & Unit capacity
  totalFloors: { type: Number, default: 1 },
  basementFloors: { type: Number, default: 0 },
  groundFloorAvailable: { type: Boolean, default: true },
  totalUnits: { type: Number, default: 0 },
  
  // Area & Technical specs
  totalBuiltUpArea: { type: Number, default: 0 },
  constructionYear: { type: Number, default: null },
  liftCount: { type: Number, default: 1 },
  staircaseCount: { type: Number, default: 1 },
  parkingCapacity: { type: Number, default: 0 },
  
  // Safety & Backup Infrastructure
  fireSafetyAvailable: { type: Boolean, default: true },
  generatorAvailable: { type: Boolean, default: true },
  waterSupplyAvailable: { type: Boolean, default: true },
  electricityBackupAvailable: { type: Boolean, default: true },
  
  // Assigned Personnel
  managerName: { type: String, default: '' },
  buildingManager: { type: String, default: '' },
  securitySupervisor: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'MAINTENANCE', 'ARCHIVED'], 
    default: 'ACTIVE',
    index: true 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

buildingSchema.index({ propertyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Building', buildingSchema);
