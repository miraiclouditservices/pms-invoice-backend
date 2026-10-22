const mongoose = require('mongoose');

const cctvStreamSessionSchema = new mongoose.Schema({
  sessionToken: { type: String, required: true, unique: true, index: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', required: true },
  channelNumber: { type: Number, default: 1 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  
  sessionType: {
    type: String,
    enum: ['LIVE', 'SNAPSHOT', 'PLAYBACK'],
    default: 'LIVE'
  },

  expiresAt: { type: Date, required: true, index: { expires: '0s' } },
  isActive: { type: Boolean, default: true },
  accessCount: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvStreamSession', cctvStreamSessionSchema);
