const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  bookingNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  bookingType: { 
    type: String, 
    enum: ['MEETING_ROOM', 'CONFERENCE_ROOM', 'HOT_DESK', 'DEDICATED_DESK', 'EVENT_SPACE', 'AMENITY'], 
    required: true,
    index: true
  },
  
  // Resource reference: can be a Unit (for desk/room) or Amenity (clubhouse, pool, etc.)
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null, index: true },
  amenityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', default: null, index: true },
  
  // Booked by user/resident/member
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoworkingMember', default: null },
  companyName: { type: String, default: '' },
  
  title: { type: String, default: 'Resource Booking' },
  purpose: { type: String, default: '' },
  attendeesCount: { type: Number, default: 1 },
  
  bookingDate: { type: Date, required: true, index: true },
  startTime: { type: String, required: true }, // e.g. "10:00"
  endTime: { type: String, required: true },   // e.g. "11:30"
  startDateTime: { type: Date, required: true, index: true },
  endDateTime: { type: Date, required: true, index: true },
  
  charges: { type: Number, default: 0 },
  creditsUsed: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  
  approvalStatus: { 
    type: String, 
    enum: ['APPROVED', 'PENDING', 'REJECTED', 'CANCELLED'], 
    default: 'APPROVED',
    index: true 
  },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  
  status: { type: String, enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED'], default: 'CONFIRMED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

bookingSchema.index({ unitId: 1, startDateTime: 1, endDateTime: 1 });
bookingSchema.index({ amenityId: 1, startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
