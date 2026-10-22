const mongoose = require('mongoose');

const cctvEventSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null, index: true },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  unitOrSpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null, index: true },
  zoneId: { type: String, default: 'COMMON_AREA', index: true },
  
  cameraId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', required: true, index: true },
  recorderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvDevice', default: null },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'CctvChannel', default: null },

  vendor: { type: String, required: true },
  
  eventType: {
    type: String,
    required: true,
    enum: [
      'motion.detected',
      'person.detected',
      'vehicle.detected',
      'face.detected',
      'line.crossed',
      'intrusion.detected',
      'loitering.detected',
      'crowd.detected',
      'abandoned.object',
      'removed.object',
      'camera.tampered',
      'camera.offline',
      'camera.online',
      'stream.failed',
      'recording.started',
      'recording.stopped',
      'recording.failed',
      'storage.full',
      'storage.failed',
      'network.failed',
      'authentication.failed',
      'access.denied',
      'access.granted',
      'door.opened',
      'door.forced',
      'ANPR.vehicle.detected',
      'fire.detected',
      'smoke.detected',
      'emergency.detected',
      'device.restarted',
      'firmware.updated',
      'channel.changed',
      'event.subscription.failed',
      'vendor.api.failed'
    ],
    index: true
  },

  eventSource: { type: String, default: 'CAMERA_AI' },
  severity: {
    type: String,
    enum: ['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true
  },

  title: { type: String, required: true },
  message: { type: String, required: true },
  eventTime: { type: Date, required: true, default: Date.now },
  receivedTime: { type: Date, required: true, default: Date.now },

  snapshotUrl: { type: String, default: '' },
  videoClipUrl: { type: String, default: '' },
  
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: { type: Number, default: 1.0, min: 0, max: 1 },

  status: {
    type: String,
    enum: ['NEW', 'DEDUPLICATED', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED', 'REOPENED'],
    default: 'NEW',
    index: true
  },

  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  dedupKey: { type: String, default: '', index: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvEvent', cctvEventSchema);
