const CctvDevice = require('../../models/CctvDevice');
const { CctvConnectionService } = require('./CctvConnectionService');
const { getIO } = require('../../sockets/socketManager');
const logger = require('../../config/logger');

class CctvHealthMonitorService {
  /**
   * Run health check cycle across active cameras and recorders
   */
  static async checkAllDevices() {
    try {
      const devices = await CctvDevice.find({ isDeleted: false });
      const io = getIO();

      for (const device of devices) {
        const port = device.onvifPort || device.httpPort || 80;
        const probe = await CctvConnectionService.probePort(device.ipAddress, port, 2000);
        const previousStatus = device.status;
        const newStatus = probe.open ? 'ONLINE' : 'OFFLINE';

        if (previousStatus !== newStatus) {
          device.status = newStatus;
          device.lastHeartbeat = new Date();
          if (!probe.open) {
            device.lastError = {
              code: 'CCTV_CAMERA_OFFLINE',
              message: `Camera ${device.name} stopped responding on port ${port}`,
              reason: 'Connection timed out or network link interrupted.',
              solution: 'Check physical camera network connection and power.',
              timestamp: new Date()
            };
          }
          await device.save();

          // Emit real-time status change to property room
          if (io) {
            const eventName = newStatus === 'ONLINE' ? 'cctv.camera.online' : 'cctv.camera.offline';
            io.to(`property:${device.propertyId}`).emit(eventName, {
              deviceId: device._id,
              name: device.name,
              status: newStatus,
              zoneId: device.zoneId,
              timestamp: new Date()
            });
          }

          logger.info(`[CCTV Health] Camera "${device.name}" status changed from ${previousStatus} to ${newStatus}`);
        } else if (newStatus === 'ONLINE') {
          device.lastHeartbeat = new Date();
          await device.save();
        }
      }
    } catch (err) {
      logger.error('Error during CCTV health monitor cycle: %o', err);
    }
  }
}

module.exports = CctvHealthMonitorService;
