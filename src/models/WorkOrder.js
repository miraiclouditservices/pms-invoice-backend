const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  
  workOrderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  
  sourceType: { type: String, enum: ['COMPLAINT', 'AMC_ROUTINE', 'PREVENTIVE', 'EMERGENCY_REPAIR'], default: 'COMPLAINT' },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
  
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  technicianName: { type: String, default: '' },
  technicianPhone: { type: String, default: '' },
  
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  estimatedCost: { type: Number, default: 0 },
  approvedCost: { type: Number, default: 0 },
  
  scheduledStartDate: { type: Date, default: Date.now },
  dueCompletionDate: { type: Date, required: true },
  actualCompletionDate: { type: Date, default: null },
  
  status: { 
    type: String, 
    enum: ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_INSPECTION', 'COMPLETED', 'CANCELLED'], 
    default: 'ASSIGNED',
    index: true 
  },
  
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
