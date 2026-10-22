const BaseCameraAdapter = require('./BaseCameraAdapter');

class CloudCameraAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
  }

  async testConnection() {
    return {
      success: true,
      statusCode: 200,
      latencyMs: 85,
      cloudConnected: true
    };
  }

  async fetchCapabilities() {
    return {
      onvifSupported: false,
      rtspSupported: false,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: true,
      twoWayAudio: false,
      recordingSupported: true,
      storageStatusSupported: true,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: this.deviceConfig.cameraType === 'ANPR_LPR',
      faceRecognitionSupported: true,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: false
    };
  }

  parseWebhookPayload(rawPayload, headers = {}) {
    const p = typeof rawPayload === 'object' ? rawPayload : JSON.parse(rawPayload || '{}');
    const eventType = p.eventType || 'person.detected';
    const severity = p.severity || 'MEDIUM';
    const title = p.title || 'Cloud AI Detection';
    const message = p.message || 'Cloud surveillance analytics notification';

    return {
      eventType,
      severity,
      title,
      message,
      eventSource: 'CLOUD_VMS',
      metadata: p.metadata || {},
      confidence: p.confidence || 0.95
    };
  }
}

module.exports = CloudCameraAdapter;
