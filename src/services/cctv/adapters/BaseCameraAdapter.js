/**
 * BaseCameraAdapter
 * Abstract contract for capability-based CCTV integrations.
 * Every vendor adapter extends this base class.
 */
class BaseCameraAdapter {
  constructor(deviceConfig) {
    this.deviceConfig = deviceConfig;
    this.vendor = deviceConfig.vendor;
    this.ip = deviceConfig.ipAddress;
    this.port = deviceConfig.httpPort || 80;
    this.username = deviceConfig.username;
    this.password = deviceConfig.password;
  }

  /**
   * Probe device reachability and test credentials
   * @returns {Promise<{ success: boolean, statusCode: number, latencyMs: number, error?: any }>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by adapter');
  }

  /**
   * Dynamically query and extract device hardware capabilities
   * @returns {Promise<object>} Capabilities map
   */
  async fetchCapabilities() {
    throw new Error('fetchCapabilities() must be implemented by adapter');
  }

  /**
   * Discover recorder channels for NVR/DVR/XVR/VMS
   * @returns {Promise<Array<{ channelNumber: number, name: string, online: boolean, type: string }>>}
   */
  async discoverChannels() {
    return [{ channelNumber: 1, name: 'Camera 01', online: true, type: 'IP_CAMERA' }];
  }

  /**
   * Subscribe to camera event streams or configure webhook URL on camera
   * @param {string} callbackUrl 
   */
  async subscribeEvents(callbackUrl) {
    throw new Error('subscribeEvents() must be implemented by adapter');
  }

  /**
   * Capture a still snapshot frame
   * @param {number} channelNumber 
   * @returns {Promise<Buffer>} JPEG image buffer
   */
  async fetchSnapshot(channelNumber = 1) {
    throw new Error('fetchSnapshot() must be implemented by adapter');
  }

  /**
   * Parse inbound raw vendor webhook or alarm payload into normalized CCTV event format
   * @param {object|string} rawPayload 
   * @param {object} headers 
   * @returns {object} Normalized event details
   */
  parseWebhookPayload(rawPayload, headers = {}) {
    throw new Error('parseWebhookPayload() must be implemented by adapter');
  }
}

module.exports = BaseCameraAdapter;
