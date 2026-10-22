const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  name: { type: String, required: true, trim: true },
  code: { type: String, uppercase: true, trim: true },
  category: { type: String, default: 'General' }, // Clubhouse, Swimming Pool, Tennis Court, Banquet Hall, Gym
  location: { type: String, default: '' },
  capacity: { type: Number, default: 20 },
  
  bookingChargesPerHour: { type: Number, default: 0 },
  depositRequired: { type: Number, default: 0 },
  rules: { type: String, default: 'Please maintain cleanliness and adhere to time limits.' },
  
  operatingHours: {
    start: { type: String, default: '06:00' },
    end: { type: String, default: '22:00' }
  },
  
  status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Amenity', amenitySchema);
