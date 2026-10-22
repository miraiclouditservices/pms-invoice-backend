const CctvDevice = require('../../models/CctvDevice');
const CctvAdapterService = require('./CctvAdapterService');
const logger = require('../../config/logger');

class CctvCapabilityService {
  /**
   * Scan and sync dynamic capabilities from hardware
   * @param {string} deviceId 
   */
  static async scanAndSyncCapabilities(deviceId) {
    const device = await CctvDevice.findById(deviceId);
    if (!device) throw new Error('Device not found');

    const adapter = CctvAdapterService.getAdapter(device);
    const capabilities = await adapter.fetchCapabilities();

    device.capabilities = {
      ...device.capabilities,
      ...capabilities
    };

    await device.save();
    logger.info(`Capabilities updated for device ${device.name} (${device._id})`);
    return device.capabilities;
  }

  /**
   * Filter feature matrix to only include genuinely supported capabilities
   */
  static getSupportedFeatures(device) {
    if (!device || !device.capabilities) return [];
    const supported = [];
    const caps = device.capabilities;

    if (caps.ptzSupported) supported.push({ key: 'PTZ', label: 'Pan-Tilt-Zoom Control' });
    if (caps.snapshotSupported) supported.push({ key: 'SNAPSHOT', label: 'Snapshot Frame Capture' });
    if (caps.audioSupported) supported.push({ key: 'AUDIO', label: 'One-way Audio Stream' });
    if (caps.twoWayAudio) supported.push({ key: 'TWO_WAY_AUDIO', label: 'Two-way Intercom Audio' });
    if (caps.recordingSupported) supported.push({ key: 'RECORDING', label: 'NVR/DVR Playback' });
    if (caps.edgeAiSupported) supported.push({ key: 'EDGE_AI', label: 'Edge AI Analytics' });
    if (caps.anprSupported) supported.push({ key: 'ANPR', label: 'Automatic License Plate Recognition' });
    if (caps.faceRecognitionSupported) supported.push({ key: 'FACE_RECOGNITION', label: 'Face Recognition' });
    if (caps.lineCrossingSupported) supported.push({ key: 'LINE_CROSSING', label: 'Virtual Line Crossing' });
    if (caps.intrusionDetectionSupported) supported.push({ key: 'INTRUSION', label: 'Zone Intrusion Detection' });
    if (caps.tamperDetectionSupported) supported.push({ key: 'TAMPER', label: 'Optical Tampering Detection' });
    if (caps.thermalSupported) supported.push({ key: 'THERMAL', label: 'Thermal Heatmap & Fire Sensing' });

    return supported;
  }
}

module.exports = CctvCapabilityService;
