const net = require('net');
const BaseCameraAdapter = require('./BaseCameraAdapter');

class RtspAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
    this.rtspPort = deviceConfig.rtspPort || 554;
  }

  /**
   * Probe RTSP port using RTSP OPTIONS negotiation
   */
  async testConnection() {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.connect(this.rtspPort, this.ip, () => {
        const req = `OPTIONS rtsp://${this.ip}:${this.rtspPort}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: NexusPMS-CCTV-Probe/1.0\r\n\r\n`;
        socket.write(req);
      });

      socket.on('data', (data) => {
        const response = data.toString();
        const latencyMs = Date.now() - startTime;
        socket.destroy();

        if (response.startsWith('RTSP/1.0 200 OK') || response.includes('Public:')) {
          resolve({ success: true, statusCode: 200, latencyMs });
        } else if (response.includes('401 Unauthorized')) {
          resolve({
            success: true, // Port is active, authenticated probe needed
            statusCode: 401,
            latencyMs,
            requiresAuth: true
          });
        } else {
          resolve({ success: true, statusCode: 200, latencyMs });
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          statusCode: 0,
          latencyMs: Date.now() - startTime,
          error: {
            code: 'CCTV_RTSP_TIMEOUT',
            message: `RTSP probe timed out on ${this.ip}:${this.rtspPort}`,
            reason: 'Device did not respond to RTSP OPTIONS handshake within 3000ms.',
            solution: 'Verify RTSP port 554 is open in camera and not blocked by router/NAT firewall.',
            retryable: true,
            requiresAdmin: false
          }
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          success: false,
          statusCode: 0,
          latencyMs: Date.now() - startTime,
          error: {
            code: 'CCTV_RTSP_DISABLED',
            message: `RTSP connection refused at ${this.ip}:${this.rtspPort}`,
            reason: err.message,
            solution: 'Enable RTSP streaming stream in camera administration console.',
            retryable: true,
            requiresAdmin: true
          }
        });
      });
    });
  }

  async fetchCapabilities() {
    return {
      onvifSupported: false,
      rtspSupported: true,
      vendorApiSupported: false,
      webhookSupported: false,
      ptzSupported: false,
      snapshotSupported: true,
      audioSupported: false,
      twoWayAudio: false,
      recordingSupported: false,
      storageStatusSupported: false,
      eventSubscriptionSupported: false,
      edgeAiSupported: false,
      anprSupported: false,
      faceRecognitionSupported: false,
      lineCrossingSupported: false,
      intrusionDetectionSupported: false,
      tamperDetectionSupported: false,
      thermalSupported: false
    };
  }

  parseWebhookPayload(rawPayload) {
    return {
      eventType: 'motion.detected',
      severity: 'LOW',
      title: 'RTSP Stream Activity',
      message: 'Video activity detected on RTSP stream channel',
      eventSource: 'RTSP_STREAM'
    };
  }
}

module.exports = RtspAdapter;
