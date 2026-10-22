const mongoose = require('mongoose');

const cctvChannelSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', required: true, index: true },
  channelNumber: { type: Number, required: true },
  channelName: { type: String, required: true },
  cameraType: {
    type: String,
    enum: [
      'IP_CAMERA', 'NETWORK_CAMERA', 'FIXED', 'DOME', 'BULLET', 'TURRET',
      'PTZ', 'FISHEYE', 'THERMAL', 'ANPR_LPR', 'INDOOR', 'OUTDOOR',
      'ANALOG_DVR', 'HD_TVI', 'AHD', 'HDCVI', 'EDGE_AI'
    ],
    default: 'FIXED'
  },
  streamProfile: { type: String, default: 'main' },
  subStreamProfile: { type: String, default: 'sub' },
  
  // Hierarchy & Property Location Mapping
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  unitOrSpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  zoneId: { type: String, default: 'MAIN_ENTRANCE' },
  locationDescription: { type: String, default: '' },

  onlineStatus: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'NO_VIDEO', 'TAMPERED'],
    default: 'ONLINE'
  },

  capabilities: {
    ptzSupported: { type: Boolean, default: false },
    snapshotSupported: { type: Boolean, default: true },
    motionDetectionSupported: { type: Boolean, default: true },
    anprSupported: { type: Boolean, default: false },
    audioSupported: { type: Boolean, default: false }
  },

  isAssigned: { type: Boolean, default: true }
}, {
  timestamps: true
});

cctvChannelSchema.index({ deviceId: 1, channelNumber: 1 }, { unique: true });

module.exports = mongoose.model('CctvChannel', cctvChannelSchema);
