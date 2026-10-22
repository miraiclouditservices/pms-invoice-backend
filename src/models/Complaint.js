const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  
  complaintNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['PLUMBING', 'ELECTRICAL', 'HVAC', 'CLEANING', 'SECURITY', 'PARKING', 'INTERNET', 'CARPENTRY', 'OTHER'],
    required: true 
  },
  description: { type: String, required: true },
  attachmentUrl: { type: String, default: '' },
  
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], 
    default: 'MEDIUM',
    index: true 
  },
  
  raisedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedByName: { type: String, default: '' },
  raisedByContact: { type: String, default: '' },
  
  assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedStaffName: { type: String, default: '' },
  
  status: { 
    type: String, 
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], 
    default: 'OPEN',
    index: true 
  },
  
  slaHours: { type: Number, default: 24 },
  dueAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  resolutionDetails: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  
  feedbackRating: { type: Number, min: 1, max: 5, default: null },
  feedbackComment: { type: String, default: '' },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', complaintSchema);
