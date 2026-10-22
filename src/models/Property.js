const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  propertyType: { 
    type: String, 
    required: true, 
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'COWORKING'], 
    index: true 
  },
  description: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },
  
  // Address Information
  address: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  landmark: { type: String, default: '' },
  area: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'India' },
  pincode: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },

  // Contact Information
  propertyEmail: { type: String, default: '' },
  propertyPhone: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  officeContactPerson: { type: String, default: '' },
  officeWorkingHours: { type: String, default: '24/7' },

  // Management Information
  managerName: { type: String, default: '' },
  managerContact: { type: String, default: '' },
  financeManager: { type: String, default: '' },
  maintenanceManager: { type: String, default: '' },
  securityManager: { type: String, default: '' },
  startDate: { type: Date, default: null },

  // Space & Metrics
  totalLandArea: { type: Number, default: 0 },
  totalBuiltUpArea: { type: Number, default: 0 },
  commonArea: { type: Number, default: 0 },
  operatingHours: { type: String, default: '24/7' },
  totalBuildings: { type: Number, default: 0 },
  totalFloors: { type: Number, default: 0 },
  totalUnits: { type: Number, default: 0 },

  // Module Enabled Settings
  modules: {
    visitor: { type: Boolean, default: true },
    parking: { type: Boolean, default: true },
    billing: { type: Boolean, default: true },
    complaints: { type: Boolean, default: true },
    amc: { type: Boolean, default: true },
    bookings: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    chat: { type: Boolean, default: true },
    accessControl: { type: Boolean, default: true }
  },
  
  status: { 
    type: String, 
    enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'ARCHIVED'], 
    default: 'ACTIVE',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

propertySchema.index({ organisationId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Property', propertySchema);
