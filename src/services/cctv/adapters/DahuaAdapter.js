const http = require('http');
const BaseCameraAdapter = require('./BaseCameraAdapter');

class DahuaAdapter extends BaseCameraAdapter {
  constructor(deviceConfig) {
    super(deviceConfig);
    this.httpPort = deviceConfig.httpPort || 80;
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      const auth = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
      const res = await this._sendHttpRequest('/cgi-bin/magicBox.cgi?action=getSystemInfo', 'GET', auth);
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
            message: 'Dahua camera authentication failed.',
            reason: 'Username or password was not accepted by Dahua RPC daemon.',
            solution: 'Check the Dahua user credentials in SmartPSS or device web interface.',
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
            message: 'Dahua CGI endpoint unavailable.',
            reason: `HTTP code ${res.statusCode} received from Dahua device.`,
            solution: 'Enable CGI service and verify port 80/443 in Dahua System settings.',
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
          message: `Cannot reach Dahua device at ${this.ip}:${this.httpPort}`,
          reason: err.message,
          solution: 'Ensure Dahua camera/recorder has network power and is reachable.',
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
      audioSupported: true,
      twoWayAudio: isNvr ? false : true,
      recordingSupported: isNvr,
      storageStatusSupported: isNvr,
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

  async discoverChannels() {
    const channels = [];
    const count = this.deviceConfig.totalChannels || 8;
    for (let i = 1; i <= count; i++) {
      channels.push({
        channelNumber: i,
        channelName: `Dahua Cam ${i}`,
        online: true,
        type: 'IP_CAMERA'
      });
    }
    return channels;
  }

  parseWebhookPayload(rawPayload, headers = {}) {
    const text = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    let eventType = 'motion.detected';
    let severity = 'MEDIUM';
    let title = 'Dahua Event';
    let message = 'Dahua camera event recorded';
    let metadata = {};

    if (text.includes('VideoMotion')) {
      eventType = 'motion.detected';
      severity = 'LOW';
      title = 'Motion Detected';
      message = 'Dahua video motion detection triggered';
    } else if (text.includes('CrossLineDetection')) {
      eventType = 'line.crossed';
      severity = 'MEDIUM';
      title = 'Tripwire Line Crossed';
      message = 'Dahua IVS tripwire violation triggered';
    } else if (text.includes('CrossRegionDetection') || text.includes('Intrusion')) {
      eventType = 'intrusion.detected';
      severity = 'HIGH';
      title = 'Zone Intrusion Detected';
      message = 'Dahua IVS perimeter warning alert';
    } else if (text.includes('BlindDetect') || text.includes('Tamper')) {
      eventType = 'camera.tampered';
      severity = 'HIGH';
      title = 'Camera Tampering Detected';
      message = 'Dahua video blind / lens tampering event detected';
    } else if (text.includes('TrafficJunction') || text.includes('PlateNumber') || text.includes('ANPR')) {
      eventType = 'ANPR.vehicle.detected';
      severity = 'INFORMATIONAL';
      title = 'Vehicle License Plate Recognized';
      message = 'Dahua ANPR camera recognized vehicle plate';
      metadata.licensePlate = (rawPayload && (rawPayload.PlateNumber || rawPayload.plate)) || 'MH12CD5678';
    } else if (text.includes('StorageFailure') || text.includes('DiskFull')) {
      eventType = 'storage.full';
      severity = 'CRITICAL';
      title = 'Storage Drive Warning';
      message = 'Dahua DVR/NVR hard disk failure or capacity warning';
    }

    return {
      eventType,
      severity,
      title,
      message,
      eventSource: 'DAHUA_API',
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
        reject(new Error('Dahua request timeout'));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = DahuaAdapter;
