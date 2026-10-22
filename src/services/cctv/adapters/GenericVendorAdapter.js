const http = require('http');
const BaseCameraAdapter = require('./BaseCameraAdapter');

class GenericVendorAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
    this.httpPort = deviceConfig.httpPort || 80;
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      const auth = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
      // Probe vendor specific health / info path or root
      const probePath = this._getVendorProbePath();
      const res = await this._sendHttpRequest(probePath, 'GET', auth);
      const latencyMs = Date.now() - startTime;

      if (res.statusCode >= 200 && res.statusCode < 400) {
        return { success: true, statusCode: res.statusCode, latencyMs };
      } else if (res.statusCode === 401) {
        return {
          success: false,
          statusCode: 401,
          latencyMs,
          error: {
            code: 'CCTV_AUTH_FAILED',
            message: `${this.vendor} authentication rejected.`,
            reason: 'Invalid vendor API username or password.',
            solution: 'Verify device credentials and ensure API access permissions are granted.',
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
            code: 'CCTV_VENDOR_API_FAILED',
            message: `${this.vendor} probe responded with status ${res.statusCode}.`,
            reason: `Device returned error on probe endpoint ${probePath}`,
            solution: 'Ensure API service is active and firewall permits traffic.',
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
          message: `Cannot reach ${this.vendor} device at ${this.ip}:${this.httpPort}`,
          reason: err.message,
          solution: 'Verify device power, physical cabling and IP connectivity.',
          retryable: true,
          requiresAdmin: false
        }
      };
    }
  }

  async fetchCapabilities() {
    const isNvr = ['NVR', 'DVR', 'XVR'].includes(this.deviceConfig.deviceType);
    return {
      onvifSupported: true,
      rtspSupported: true,
      vendorApiSupported: true,
      webhookSupported: true,
      ptzSupported: this.deviceConfig.cameraType === 'PTZ',
      snapshotSupported: true,
      audioSupported: false,
      twoWayAudio: false,
      recordingSupported: isNvr,
      storageStatusSupported: isNvr,
      eventSubscriptionSupported: true,
      edgeAiSupported: ['HANWHA', 'BOSCH'].includes(this.vendor),
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
    let title = `${this.vendor} Camera Event`;
    let message = 'Event received from camera security feed';

    if (text.includes('Intrusion') || text.includes('AreaEntered')) {
      eventType = 'intrusion.detected';
      severity = 'HIGH';
      title = 'Intrusion Alert';
      message = 'Perimeter zone intrusion recorded by camera sensor';
    } else if (text.includes('Line') || text.includes('Crossing')) {
      eventType = 'line.crossed';
      severity = 'MEDIUM';
      title = 'Boundary Crossed';
      message = 'Virtual line crossing triggered';
    } else if (text.includes('Tamper') || text.includes('Occlusion')) {
      eventType = 'camera.tampered';
      severity = 'HIGH';
      title = 'Camera Tampered';
      message = 'Camera lens coverage or optical tampering detected';
    } else if (text.includes('Plate') || text.includes('ANPR')) {
      eventType = 'ANPR.vehicle.detected';
      severity = 'INFORMATIONAL';
      title = 'Vehicle Recognized';
      message = 'Vehicle number plate read by security gate camera';
    } else if (text.includes('Motion')) {
      eventType = 'motion.detected';
      severity = 'LOW';
      title = 'Motion Detected';
      message = 'Motion detection triggered';
    }

    return {
      eventType,
      severity,
      title,
      message,
      eventSource: `${this.vendor}_ADAPTER`,
      metadata: {}
    };
  }

  _getVendorProbePath() {
    switch (this.vendor) {
      case 'HANWHA': return '/stw-cgi/systeminfo.cgi';
      case 'BOSCH': return '/rcp.xml?cmd=READ_CONFIG';
      case 'UNIVIEW': return '/LAPI/V1.0/System/DeviceInfo';
      default: return '/';
    }
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
        reject(new Error('Device request timed out'));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = GenericVendorAdapter;
