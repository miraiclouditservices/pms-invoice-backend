const mongoose = require('mongoose');

const cctvDeviceSchema = new mongoose.Schema({
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
  floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', default: null },
  unitOrSpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  zoneId: { type: String, default: 'MAIN_ENTRANCE' },
  locationDescription: { type: String, default: '' },

  deviceType: {
    type: String,
    required: true,
    enum: ['CAMERA', 'NVR', 'DVR', 'XVR', 'VMS', 'CLOUD_VMS', 'GATEWAY'],
    default: 'CAMERA',
    index: true
  },

  cameraType: {
    type: String,
    enum: [
      'IP_CAMERA', 'NETWORK_CAMERA', 'FIXED', 'DOME', 'BULLET', 'TURRET',
      'PTZ', 'FISHEYE', 'THERMAL', 'ANPR_LPR', 'INDOOR', 'OUTDOOR',
      'WIFI', 'CELLULAR_4G', 'DOOR_CAMERA', 'ANALOG_DVR', 'HD_TVI',
      'AHD', 'HDCVI', 'HYBRID', 'CLOUD', 'EDGE_AI'
    ],
    default: 'IP_CAMERA'
  },

  name: { type: String, required: true, trim: true },
  vendor: {
    type: String,
    required: true,
    enum: ['HIKVISION', 'DAHUA', 'AXIS', 'HANWHA', 'BOSCH', 'UNIVIEW', 'GENERIC_ONVIF', 'GENERIC_RTSP', 'CLOUD'],
    default: 'GENERIC_ONVIF',
    index: true
  },
  model: { type: String, default: 'Universal Model' },
  firmwareVersion: { type: String, default: '1.0.0' },
  serialNumber: { type: String, default: '' },
  macAddress: { type: String, default: '' },

  // Network & Ports
  ipAddress: { type: String, required: true },
  hostname: { type: String, default: '' },
  domain: { type: String, default: '' },
  httpPort: { type: Number, default: 80 },
  httpsPort: { type: Number, default: 443 },
  rtspPort: { type: Number, default: 554 },
  onvifPort: { type: Number, default: 80 },
  vendorApiPort: { type: Number, default: 80 },

  // Encrypted Credentials (AES-256-GCM)
  username: { type: String, required: true, default: 'admin' },
  credentialsEncrypted: {
    cipherText: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
  },

  // Inbound Webhook Secret for push notifications from cameras/recorders
  webhookSecret: { type: String, default: '' },

  // Protocol & Stream Profile
  protocol: {
    type: String,
    enum: ['ONVIF', 'RTSP', 'ISAPI', 'DAHUA_RPC', 'VAPIX', 'HANWHA_CGI', 'BOSCH_RCP', 'UNIVIEW_LAPI', 'CLOUD_REST', 'GENERIC_HTTP'],
    default: 'ONVIF'
  },
  streamProfile: { type: String, default: 'main' },
  subStreamProfile: { type: String, default: 'sub' },
  channelNumber: { type: Number, default: 1 },
  totalChannels: { type: Number, default: 1 },

  // Dynamically Detected Capabilities
  capabilities: {
    onvifSupported: { type: Boolean, default: false },
    rtspSupported: { type: Boolean, default: false },
    vendorApiSupported: { type: Boolean, default: false },
    webhookSupported: { type: Boolean, default: false },
    ptzSupported: { type: Boolean, default: false },
    snapshotSupported: { type: Boolean, default: false },
    audioSupported: { type: Boolean, default: false },
    twoWayAudio: { type: Boolean, default: false },
    recordingSupported: { type: Boolean, default: false },
    storageStatusSupported: { type: Boolean, default: false },
    eventSubscriptionSupported: { type: Boolean, default: false },
    edgeAiSupported: { type: Boolean, default: false },
    anprSupported: { type: Boolean, default: false },
    faceRecognitionSupported: { type: Boolean, default: false },
    lineCrossingSupported: { type: Boolean, default: false },
    intrusionDetectionSupported: { type: Boolean, default: false },
    tamperDetectionSupported: { type: Boolean, default: false },
    thermalSupported: { type: Boolean, default: false }
  },

  // Operational Status
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'TAMPERED', 'DEGRADED', 'UNAUTHENTICATED', 'MAINTENANCE'],
    default: 'ONLINE',
    index: true
  },
  lastHeartbeat: { type: Date, default: Date.now },
  lastError: {
    code: { type: String, default: null },
    message: { type: String, default: null },
    reason: { type: String, default: null },
    solution: { type: String, default: null },
    timestamp: { type: Date, default: null }
  },

  // Security & Permissions
  securityGroup: { type: String, default: 'GENERAL' },
  isPrivacyMasked: { type: Boolean, default: false },
  allowedRoles: [{ type: String }],
  allowedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  isDeleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('CctvDevice', cctvDeviceSchema);
