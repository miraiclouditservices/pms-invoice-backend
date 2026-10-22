const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  
  slotNumber: { type: String, required: true, trim: true },
  slotType: { 
    type: String, 
    enum: ['2_WHEELER', '4_WHEELER', 'EV_CHARGING', 'VISITOR', 'VIP'], 
    default: '4_WHEELER' 
  },
  floorArea: { type: String, default: 'Basement 1' },
  
  allocatedUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  allocatedUnitNumber: { type: String, default: '' },
  assignedToName: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  
  monthlyFee: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'], 
    default: 'AVAILABLE',
    index: true 
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

parkingSlotSchema.index({ propertyId: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
