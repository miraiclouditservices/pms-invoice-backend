const net = require('net');
const dns = require('dns').promises;
const CctvAdapterService = require('./CctvAdapterService');
const logger = require('../../config/logger');

// Error diagnostic catalog mapping specific network / device issues
const ERROR_CATALOG = {
  INVALID_IP: {
    code: 'CCTV_INVALID_IP',
    message: 'The provided IP address or hostname is malformed.',
    reason: 'IP syntax does not conform to IPv4/IPv6 standards or hostname is invalid.',
    solution: 'Verify the IP format (e.g. 192.168.1.100) or specify a valid local hostname.',
    retryable: false,
    requiresAdmin: true
  },
  DNS_FAILURE: {
    code: 'CCTV_DNS_FAILURE',
    message: 'DNS resolution failed for device hostname.',
    reason: 'The local or cloud DNS server could not resolve the specified domain name.',
    solution: 'Check local DNS configuration or use the static local IP address directly.',
    retryable: true,
    requiresAdmin: true
  },
  UNREACHABLE: {
    code: 'CCTV_DEVICE_UNREACHABLE',
    message: 'Camera or recorder is offline or unreachable on the network.',
    reason: 'No TCP response received on the configured network port.',
    solution: 'Check power cable/PoE injector, physical switch port, and verify IP subnet routing.',
    retryable: true,
    requiresAdmin: false
  },
  AUTH_FAILED: {
    code: 'CCTV_AUTH_FAILED',
    message: 'Authentication failed. Access denied by camera or recorder.',
    reason: 'The provided username or password was rejected by the device security subsystem.',
    solution: 'Verify username and password in the camera web interface or reset device password.',
    retryable: true,
    requiresAdmin: true
  },
  ONVIF_DISABLED: {
    code: 'CCTV_ONVIF_DISABLED',
    message: 'ONVIF is disabled on this device.',
    reason: 'The camera does not accept ONVIF discovery or event requests on port 80/8080.',
    solution: 'Enable ONVIF in camera settings and create an ONVIF user with Administrator privileges.',
    retryable: true,
    requiresAdmin: true
  },
  RTSP_DISABLED: {
    code: 'CCTV_RTSP_DISABLED',
    message: 'RTSP video streaming is disabled or blocked on port 554.',
    reason: 'The camera refused RTSP socket connection or RTSP daemon is stopped.',
    solution: 'Enable RTSP in camera stream configuration and verify port 554 is open.',
    retryable: true,
    requiresAdmin: true
  },
  VENDOR_API_DISABLED: {
    code: 'CCTV_VENDOR_API_DISABLED',
    message: 'Vendor API integration protocol is not active on this device.',
    reason: 'The camera requires explicit activation for ISAPI, VAPIX, or CGI web service.',
    solution: 'Open camera network settings and enable Integration Protocol / HTTP API.',
    retryable: true,
    requiresAdmin: true
  },
  STORAGE_FULL: {
    code: 'CCTV_STORAGE_FULL',
    message: 'Recorder storage capacity has reached 100%.',
    reason: 'Hard drive is completely full and automatic loop recording overwrite is disabled.',
    solution: 'Enable automatic overwrite in NVR storage configuration or add additional hard drives.',
    retryable: false,
    requiresAdmin: true
  }
};

class CctvConnectionService {
  /**
   * Validate IP syntax or DNS resolution
   */
  static async validateNetworkAddress(host) {
    if (!host || typeof host !== 'string') {
      return { valid: false, error: ERROR_CATALOG.INVALID_IP };
    }

    const isIp = net.isIP(host.trim());
    if (isIp) {
      return { valid: true, ip: host.trim() };
    }

    // Hostname / domain resolution
    try {
      const resolved = await dns.lookup(host.trim());
      return { valid: true, ip: resolved.address };
    } catch (dnsErr) {
      return {
        valid: false,
        error: {
          ...ERROR_CATALOG.DNS_FAILURE,
          details: dnsErr.message
        }
      };
    }
  }

  /**
   * Probe raw TCP port connectivity
   */
  static probePort(ip, port, timeoutMs = 2500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.connect(port, ip, () => {
        socket.destroy();
        resolve({ open: true, port });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, port, error: 'TIMEOUT' });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ open: false, port, error: err.code || 'REFUSED' });
      });
    });
  }

  /**
   * Step 4: Complete Automatic Detection and Connection Test Pipeline
   */
  static async testConnection(connectionDetails) {
    const startTime = Date.now();
    const host = connectionDetails.ipAddress || connectionDetails.hostname;

    // 1. Validate IP / DNS
    const netCheck = await this.validateNetworkAddress(host);
    if (!netCheck.valid) {
      return {
        success: false,
        stepFailed: 'NETWORK_VALIDATION',
        error: netCheck.error,
        latencyMs: Date.now() - startTime
      };
    }

    const resolvedIp = netCheck.ip;
    const httpPort = connectionDetails.httpPort || 80;
    const rtspPort = connectionDetails.rtspPort || 554;
    const onvifPort = connectionDetails.onvifPort || httpPort;

    // 2. Check Port Reachability in parallel
    const [httpProbe, rtspProbe, onvifProbe] = await Promise.all([
      this.probePort(resolvedIp, httpPort),
      this.probePort(resolvedIp, rtspPort),
      this.probePort(resolvedIp, onvifPort)
    ]);

    // 3. Instantiate vendor adapter
    const adapter = CctvAdapterService.getAdapter({
      ...connectionDetails,
      ipAddress: resolvedIp
    }, connectionDetails.password);

    // 4. Test Adapter Auth & Protocol
    let adapterResult;
    try {
      adapterResult = await adapter.testConnection();
    } catch (err) {
      adapterResult = {
        success: false,
        error: {
          code: 'CCTV_ADAPTER_ERROR',
          message: err.message,
          solution: 'Verify device vendor profile and protocol selection.',
          retryable: true,
          requiresAdmin: true
        }
      };
    }

    // 5. Fetch Capabilities dynamically
    let capabilities = {};
    if (adapterResult.success) {
      capabilities = await adapter.fetchCapabilities();
    }

    // 6. Discover channels if recorder
    let channels = [];
    if (adapterResult.success && ['NVR', 'DVR', 'XVR', 'VMS'].includes(connectionDetails.deviceType)) {
      channels = await adapter.discoverChannels();
    }

    const totalLatency = Date.now() - startTime;

    return {
      success: adapterResult.success,
      resolvedIp,
      ports: {
        http: httpProbe.open,
        rtsp: rtspProbe.open,
        onvif: onvifProbe.open
      },
      protocolsDetected: {
        onvif: onvifProbe.open || adapterResult.success,
        rtsp: rtspProbe.open,
        vendorApi: adapterResult.success
      },
      capabilities,
      channels,
      latencyMs: totalLatency,
      error: adapterResult.error || null
    };
  }
}

module.exports = {
  CctvConnectionService,
  ERROR_CATALOG
};
