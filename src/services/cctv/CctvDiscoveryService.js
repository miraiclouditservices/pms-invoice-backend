const CctvChannel = require('../../models/CctvChannel');
const CctvDevice = require('../../models/CctvDevice');
const CctvAdapterService = require('./CctvAdapterService');
const logger = require('../../config/logger');

class CctvDiscoveryService {
  /**
   * Discover and map channels for a recorded device
   */
  static async discoverAndMapChannels(deviceId, propertyMapping) {
    const device = await CctvDevice.findById(deviceId);
    if (!device) throw new Error('Device not found');

    const adapter = CctvAdapterService.getAdapter(device);
    const discovered = await adapter.discoverChannels();

    const results = [];
    for (const ch of discovered) {
      // Check if channel already exists
      let channelDoc = await CctvChannel.findOne({
        deviceId: device._id,
        channelNumber: ch.channelNumber
      });

      if (!channelDoc) {
        channelDoc = await CctvChannel.create({
          deviceId: device._id,
          channelNumber: ch.channelNumber,
          channelName: ch.channelName || `Camera Channel ${ch.channelNumber}`,
          cameraType: ch.type || 'IP_CAMERA',
          propertyId: propertyMapping.propertyId || device.propertyId,
          buildingId: propertyMapping.buildingId || device.buildingId,
          floorId: propertyMapping.floorId || device.floorId,
          unitOrSpaceId: propertyMapping.unitOrSpaceId || device.unitOrSpaceId,
          zoneId: propertyMapping.zoneId || device.zoneId || 'MAIN_ENTRANCE',
          onlineStatus: ch.online ? 'ONLINE' : 'OFFLINE',
          capabilities: ch.capabilities || { snapshotSupported: true, motionDetectionSupported: true }
        });
      }
      results.push(channelDoc);
    }

    // Update total channels on device
    device.totalChannels = discovered.length;
    await device.save();

    return results;
  }

  /**
   * Validate and reassign channel mappings with duplicate detection
   */
  static async updateChannelMapping(channelId, updatePayload) {
    const channel = await CctvChannel.findById(channelId);
    if (!channel) throw new Error('Channel not found');

    // Duplicate check: ensure no other channel on same device has identical channelNumber
    if (updatePayload.channelNumber && updatePayload.channelNumber !== channel.channelNumber) {
      const duplicate = await CctvChannel.findOne({
        deviceId: channel.deviceId,
        channelNumber: updatePayload.channelNumber,
        _id: { $ne: channel._id }
      });
      if (duplicate) {
        throw new Error(`Channel number ${updatePayload.channelNumber} is already mapped to ${duplicate.channelName}`);
      }
      channel.channelNumber = updatePayload.channelNumber;
    }

    if (updatePayload.channelName) channel.channelName = updatePayload.channelName;
    if (updatePayload.cameraType) channel.cameraType = updatePayload.cameraType;
    if (updatePayload.buildingId !== undefined) channel.buildingId = updatePayload.buildingId;
    if (updatePayload.floorId !== undefined) channel.floorId = updatePayload.floorId;
    if (updatePayload.unitOrSpaceId !== undefined) channel.unitOrSpaceId = updatePayload.unitOrSpaceId;
    if (updatePayload.zoneId) channel.zoneId = updatePayload.zoneId;
    if (updatePayload.locationDescription !== undefined) channel.locationDescription = updatePayload.locationDescription;

    await channel.save();
    return channel;
  }
}

module.exports = CctvDiscoveryService;
