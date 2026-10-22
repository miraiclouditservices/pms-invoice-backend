const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  residentType: { type: String, enum: ['OWNER', 'TENANT'], required: true },
  profilePhoto: { type: String, default: '' },

  familyMembers: [{
    name: { type: String, required: true },
    relation: { type: String, required: true },
    age: { type: Number },
    mobile: { type: String }
  }],

  emergencyContact: {
    name: { type: String, default: '' },
    relation: { type: String, default: '' },
    phone: { type: String, default: '' }
  },

  vehicles: [{
    vehicleType: { type: String, enum: ['2_WHEELER', '4_WHEELER'] },
    vehicleNumber: { type: String, required: true },
    parkingSlot: { type: String }
  }],

  moveInDate: { type: Date, default: Date.now },
  moveOutDate: { type: Date, default: null },
  kycDocumentUrl: { type: String, default: '' },
  kycVerified: { type: Boolean, default: false },

  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resident', residentSchema);
