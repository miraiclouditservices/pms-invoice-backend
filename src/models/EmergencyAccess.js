const mongoose = require('mongoose');

const emergencyAccessSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  propertyName: { type: String, default: '' },
  
  emergencyType: { 
    type: String, 
    enum: ['MEDICAL_EMERGENCY', 'FIRE_EMERGENCY', 'POLICE', 'AMBULANCE', 'DISASTER_RESPONSE', 'SECURITY_THREAT', 'OTHER'],
    required: true 
  },
  visitorName: { type: String, required: true },
  organisation: { type: String, default: '' }, // e.g. Apollo Hospital Ambulance, Mumbai Fire Brigade
  contactNumber: { type: String, default: '' },
  emergencyReason: { type: String, required: true },
  
  hostOrTargetUnit: { type: String, default: '' },
  entryGate: { type: String, default: 'Emergency Gate' },
  allowedArea: { type: String, default: 'All Critical Access Areas' },
  
  supervisorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  supervisorName: { type: String, default: '' },
  
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date, default: null },
  emergencyNotes: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyAccess', emergencyAccessSchema);
