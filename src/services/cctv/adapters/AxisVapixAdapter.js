const http = require('http');
const BaseCameraAdapter = require('./BaseCameraAdapter');

class AxisVapixAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
    this.httpPort = deviceConfig.httpPort || 80;
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      const auth = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const res = await this._sendHttpRequest('/axis-cgi/basic-device-info.cgi', 'GET', auth);
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
            message: 'Axis VAPIX authentication failed.',
            reason: 'Unauthorized user credentials on Axis camera.',
            solution: 'Verify the Axis camera root or operator password.',
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
            code: 'CCTV_VENDOR_API_DISABLED',
            message: 'Axis VAPIX endpoint not responding.',
            reason: `HTTP ${res.statusCode} received from /axis-cgi/basic-device-info.cgi.`,
            solution: 'Check Axis camera web interface and enable VAPIX HTTP API.',
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
          message: `Cannot reach Axis device at ${this.ip}:${this.httpPort}`,
          reason: err.message,
          solution: 'Ensure Axis camera has power over ethernet (PoE) and is reachable.',
          retryable: true,
          requiresAdmin: false
        }
      };
    }
  }

  async fetchCapabilities() {
    return {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: this.deviceConfig.cameraType === 'PTZ',
      snapshotSupported: true,
      audioSupported: true,
      twoWayAudio: true,
      recordingSupported: true,
      storageStatusSupported: true,
      eventSubscriptionSupported: true,
      edgeAiSupported: true,
      anprSupported: this.deviceConfig.cameraType === 'ANPR_LPR',
      faceRecognitionSupported: false,
      lineCrossingSupported: true,
      intrusionDetectionSupported: true,
      tamperDetectionSupported: true,
      thermalSupported: this.deviceConfig.cameraType === 'THERMAL'
    };
  }

  parseWebhookPayload(rawPayload, headers = {}) {
    const text = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    let eventType = 'motion.detected';
    let severity = 'MEDIUM';
    let title = 'Axis VAPIX Event';
    let message = 'Axis camera analytics event triggered';
    let metadata = {};

    if (text.includes('FenceGuard') || text.includes('Intrusion')) {
      eventType = 'intrusion.detected';
      severity = 'HIGH';
      title = 'Axis Fence Guard Intrusion';
      message = 'Perimeter barrier breached according to Axis Fence Guard analytics';
    } else if (text.includes('CrosslineDetection') || text.includes('LineCrossing')) {
      eventType = 'line.crossed';
      severity = 'MEDIUM';
      title = 'Virtual Line Crossed';
      message = 'Axis crossline analytics alert recorded';
    } else if (text.includes('Tampering') || text.includes('Tamper')) {
      eventType = 'camera.tampered';
      severity = 'HIGH';
      title = 'Camera Tampered';
      message = 'Axis active tampering alarm: camera redirected or covered';
    } else if (text.includes('LicensePlate') || text.includes('ALPR')) {
      eventType = 'ANPR.vehicle.detected';
      severity = 'INFORMATIONAL';
      title = 'Vehicle Recognized by Axis ALPR';
      message = 'Axis License Plate Verifier identified license plate';
      metadata.licensePlate = (rawPayload && rawPayload.plate) || 'DL01EF9988';
    } else if (text.includes('Motion')) {
      eventType = 'motion.detected';
      severity = 'LOW';
      title = 'Motion Detected';
      message = 'Axis video motion detection (VMD) trigger';
    }

    return {
      eventType,
      severity,
      title,
      message,
      eventSource: 'AXIS_VAPIX',
      metadata
    };
  }

  _sendHttpRequest(path, method = 'GET', authHeader) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: this.ip,
        port: this.httpPort,
        path: path,
        method: method,
        headers: { 'Authorization': authHeader },
        timeout: 3500
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Axis request timeout'));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = AxisVapixAdapter;
