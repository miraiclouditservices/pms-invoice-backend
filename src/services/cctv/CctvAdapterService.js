const OnvifAdapter = require('./adapters/OnvifAdapter');
const RtspAdapter = require('./adapters/RtspAdapter');
const HikvisionIsapiAdapter = require('./adapters/HikvisionIsapiAdapter');
const DahuaAdapter = require('./adapters/DahuaAdapter');
const AxisVapixAdapter = require('./adapters/AxisVapixAdapter');
const GenericVendorAdapter = require('./adapters/GenericVendorAdapter');
const CloudCameraAdapter = require('./adapters/CloudCameraAdapter');
const { decryptCredentials } = require('../../utils/cctvCrypto');

class CctvAdapterService {
  /**
   * Instantiate appropriate vendor adapter for a given camera or recorder
   * @param {object} device - CctvDevice mongoose doc or plain object
   * @param {string} [decryptedPassword] - Optional decrypted password override
   */
  static getAdapter(device, decryptedPassword = null) {
    let password = decryptedPassword;
    if (!password && device.credentialsEncrypted) {
      try {
        password = decryptCredentials(device.credentialsEncrypted);
      } catch (err) {
        password = '';
      }
    }

    const config = {
      ...device.toObject ? device.toObject() : device,
      password
    };

    const vendor = (config.vendor || 'GENERIC_ONVIF').toUpperCase();
    const protocol = (config.protocol || 'ONVIF').toUpperCase();

    if (vendor === 'CLOUD' || protocol === 'CLOUD_REST') {
      return new CloudCameraAdapter(config);
    }
    if (vendor === 'HIKVISION' || protocol === 'ISAPI') {
      return new HikvisionIsapiAdapter(config);
    }
    if (vendor === 'DAHUA' || protocol === 'DAHUA_RPC') {
      return new DahuaAdapter(config);
    }
    if (vendor === 'AXIS' || protocol === 'VAPIX') {
      return new AxisVapixAdapter(config);
    }
    if (['HANWHA', 'BOSCH', 'UNIVIEW'].includes(vendor)) {
      return new GenericVendorAdapter(config);
    }
    if (protocol === 'RTSP') {
      return new RtspAdapter(config);
    }
    // Default standard ONVIF adapter
    return new OnvifAdapter(config);
  }
}

module.exports = CctvAdapterService;
