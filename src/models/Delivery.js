const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  propertyName: { type: String, default: '' },
  buildingName: { type: String, default: '' },
  unitNumber: { type: String, default: '' },
  
  deliveryNumber: { type: String, required: true, unique: true, uppercase: true },
  deliveryPersonName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  deliveryCompany: { type: String, required: true, trim: true }, // Swiggy, Zomato, Amazon, BlueDart, Dunzo, etc.
  deliveryType: { 
    type: String, 
    enum: ['FOOD_DELIVERY', 'COURIER', 'ECOMMERCE', 'GROCERY', 'MEDICINE', 'DOCUMENTS', 'MAINTENANCE_MATERIAL', 'OTHER'],
    default: 'FOOD_DELIVERY'
  },
  
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  hostName: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  packageCount: { type: Number, default: 1 },
  packageDescription: { type: String, default: '' },
  
  otpCode: { type: String, default: '4392' },
  isOtpVerified: { type: Boolean, default: false },
  recipientConfirmation: { type: Boolean, default: false },
  
  entryGate: { type: String, default: 'Main Gate' },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date, default: null },
  
  deliveryStatus: { 
    type: String, 
    enum: ['EXPECTED', 'ARRIVED', 'HOST_CONTACTED', 'ACCEPTED', 'REJECTED', 'HANDED_OVER', 'COLLECTED', 'EXITED', 'CANCELLED'],
    default: 'ARRIVED',
    index: true 
  },
  
  securityRemarks: { type: String, default: '' },
  receivedBySecurityId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);
