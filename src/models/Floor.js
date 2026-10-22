const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floorNumber: { type: Number, required: true },
  floorName: { type: String, required: true, trim: true },
  floorCode: { type: String, uppercase: true, trim: true },
  
  floorType: {
    type: String,
    enum: [
      'BASEMENT',
      'GROUND_FLOOR',
      'MEZZANINE',
      'STANDARD_FLOOR',
      'TERRACE',
      'PARKING_FLOOR',
      'SERVICE_FLOOR',
      'ZONE'
    ],
    default: 'STANDARD_FLOOR',
    index: true
  },
  
  description: { type: String, default: '' },
  totalArea: { type: Number, default: 0 },
  usableArea: { type: Number, default: 0 },
  rentableArea: { type: Number, default: 0 },
  commonArea: { type: Number, default: 0 },
  totalUnits: { type: Number, default: 0 },
  
  floorManager: { type: String, default: '' },
  securityAccessLevel: { type: String, default: 'Standard' },
  
  // Facilities & Access
  fireExitAvailable: { type: Boolean, default: true },
  liftAccess: { type: Boolean, default: true },
  commonAreaAvailable: { type: Boolean, default: true },
  washroomsAvailable: { type: Boolean, default: true },
  pantryAvailable: { type: Boolean, default: false },
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RESTRICTED'], 
    default: 'ACTIVE',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

floorSchema.index({ buildingId: 1, floorNumber: 1 }, { unique: true });

module.exports = mongoose.model('Floor', floorSchema);
