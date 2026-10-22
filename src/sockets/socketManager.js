const { Server } = require('socket.io');
const logger = require('../config/logger');

let ioInstance = null;

const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT']
    }
  });

  ioInstance.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    // Join tenant & property rooms
    socket.on('join_organisation', (organisationId) => {
      if (organisationId) {
        socket.join(`organisation:${organisationId}`);
        logger.info(`Socket ${socket.id} joined organisation:${organisationId}`);
      }
    });

    socket.on('join_property', (propertyId) => {
      if (propertyId) {
        socket.join(`property:${propertyId}`);
        logger.info(`Socket ${socket.id} joined property:${propertyId}`);
      }
    });

    socket.on('join_building', (buildingId) => {
      if (buildingId) {
        socket.join(`building:${buildingId}`);
        logger.info(`Socket ${socket.id} joined building:${buildingId}`);
      }
    });

    socket.on('join_floor', (floorId) => {
      if (floorId) {
        socket.join(`floor:${floorId}`);
        logger.info(`Socket ${socket.id} joined floor:${floorId}`);
      }
    });

    socket.on('join_zone', (zoneId) => {
      if (zoneId) {
        socket.join(`zone:${zoneId}`);
        logger.info(`Socket ${socket.id} joined zone:${zoneId}`);
      }
    });

    socket.on('join_camera', (cameraId) => {
      if (cameraId) {
        socket.join(`camera:${cameraId}`);
        logger.info(`Socket ${socket.id} joined camera:${cameraId}`);
      }
    });

    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        logger.info(`Socket ${socket.id} joined user:${userId}`);
      }
    });

    socket.on('join_role', (roleId) => {
      if (roleId) {
        socket.join(`role:${roleId}`);
        logger.info(`Socket ${socket.id} joined role:${roleId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

const getIO = () => ioInstance;

const emitToOrganisation = (organisationId, event, data) => {
  if (ioInstance && organisationId) {
    ioInstance.to(`organisation:${organisationId}`).emit(event, data);
  }
};

const emitToProperty = (propertyId, event, data) => {
  if (ioInstance && propertyId) {
    ioInstance.to(`property:${propertyId}`).emit(event, data);
  }
};

const emitToZone = (zoneId, event, data) => {
  if (ioInstance && zoneId) {
    ioInstance.to(`zone:${zoneId}`).emit(event, data);
  }
};

const emitToCamera = (cameraId, event, data) => {
  if (ioInstance && cameraId) {
    ioInstance.to(`camera:${cameraId}`).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};

const emitToRole = (roleId, event, data) => {
  if (ioInstance && roleId) {
    ioInstance.to(`role:${roleId}`).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToOrganisation,
  emitToProperty,
  emitToZone,
  emitToCamera,
  emitToUser,
  emitToRole
};
