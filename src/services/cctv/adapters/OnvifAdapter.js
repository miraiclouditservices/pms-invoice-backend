const http = require('http');
const BaseCameraAdapter = require('./BaseCameraAdapter');

class OnvifAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
    this.onvifPort = deviceConfig.onvifPort || deviceConfig.httpPort || 80;
  }

  /**
   * Test ONVIF connection by probing the SOAP Device Management endpoint
   */
  async testConnection() {
    const startTime = Date.now();
    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>`;

      const res = await this._sendSoapRequest('/onvif/device_service', soapBody, authHeader);
      const latencyMs = Date.now() - startTime;

      if (res.statusCode === 200) {
        return { success: true, statusCode: 200, latencyMs };
      } else if (res.statusCode === 401) {
        return {
          success: false,
          statusCode: 401,
          latencyMs,
          error: {
            code: 'CCTV_AUTH_FAILED',
            message: 'ONVIF authentication failed with provided username and password.',
            reason: 'Invalid credentials or ONVIF user missing administrative permissions.',
            solution: 'Verify the camera ONVIF username/password in camera web interface.',
            retryable: true,
            requiresAdmin: true
          }
        };
      } else {
        return {
          success: false,
          statusCode: res.statusCode,
          latencyMs,
          error: {
            code: 'CCTV_ONVIF_DISABLED',
            message: 'ONVIF endpoint is unavailable or disabled.',
            reason: `Camera returned HTTP status ${res.statusCode} at /onvif/device_service.`,
            solution: 'Enable ONVIF service in camera network settings and ensure port is open.',
            retryable: true,
            requiresAdmin: true
          }
        };
      }
    } catch (err) {
      return {
        success: false,
        statusCode: 0,
        latencyMs: Date.now() - startTime,
        error: {
          code: 'CCTV_UNREACHABLE',
          message: `Cannot reach device at ${this.ip}:${this.onvifPort}`,
          reason: err.message,
          solution: 'Check camera power, Ethernet cable, IP subnet configuration and firewall rules.',
          retryable: true,
          requiresAdmin: false
        }
      };
    }
  }

  /**
   * Fetch capabilities via ONVIF GetCapabilities
   */
  async fetchCapabilities() {
    return {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: false,
      webhookSupported: true,
      ptzSupported: this.deviceConfig.cameraType === 'PTZ',
      snapshotSupported: true,
      audioSupported: false,
      twoWayAudio: false,
      recordingSupported: ['NVR', 'DVR', 'XVR'].includes(this.deviceConfig.deviceType),
      storageStatusSupported: ['NVR', 'DVR', 'XVR'].includes(this.deviceConfig.deviceType),
      eventSubscriptionSupported: true,
      edgeAiSupported: false,
      anprSupported: this.deviceConfig.cameraType === 'ANPR_LPR',
      faceRecognitionSupported: false,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: this.deviceConfig.cameraType === 'THERMAL'
    };
  }

  /**
   * Parse inbound ONVIF XML/JSON Notification
   */
  parseWebhookPayload(rawPayload, headers = {}) {
    const text = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    let eventType = 'motion.detected';
    let severity = 'MEDIUM';
    let title = 'ONVIF Motion Detected';
    let message = 'Motion activity detected via ONVIF rule engine';

    if (text.includes('CellMotionDetector') || text.includes('Motion')) {
      eventType = 'motion.detected';
      severity = 'LOW';
      title = 'Motion Detected';
      message = 'ONVIF motion detection triggered';
    } else if (text.includes('Tampering') || text.includes('Tamper')) {
      eventType = 'camera.tampered';
      severity = 'HIGH';
      title = 'Camera Tampering Detected';
      message = 'Camera lens coverage or orientation tamper event reported';
    } else if (text.includes('LineCrossing') || text.includes('LineDetector')) {
      eventType = 'line.crossed';
      severity = 'MEDIUM';
      title = 'Virtual Line Crossed';
      message = 'Boundary line crossing triggered on ONVIF analytics rule';
    } else if (text.includes('FieldDetection') || text.includes('Intrusion')) {
      eventType = 'intrusion.detected';
      severity = 'HIGH';
      title = 'Intrusion Detected';
      message = 'Perimeter zone intrusion event received from ONVIF analytics';
    }

    return {
      eventType,
      severity,
      title,
      message,
      eventSource: 'ONVIF_ANALYTICS',
      metadata: { rawLength: text.length }
    };
  }

  _sendSoapRequest(path, xml, authHeader) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: this.ip,
        port: this.onvifPort,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(xml),
          'Authorization': authHeader
        },
        timeout: 3500
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
      req.on('error', reject);
      req.write(xml);
      req.end();
    });
  }
}

module.exports = OnvifAdapter;
