const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../config/logger');

let memoryServer = null;

const connectDB = async () => {
  try {
    // Attempt connecting to configured MONGODB_URI first
    logger.info(`Attempting MongoDB connection to: ${env.MONGODB_URI}`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    logger.info('MongoDB Connected successfully to external/local instance');
  } catch (err) {
    logger.warn(`External MongoDB connection failed: ${err.message}`);
    if (env.USE_MEMORY_DB_FALLBACK) {
      logger.info('Initializing embedded MongoMemoryServer for zero-config speed data & local development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        await mongoose.connect(memUri);
        logger.info(`Connected to embedded MongoDB at: ${memUri}`);
      } catch (memErr) {
        logger.error(`Failed to start MongoMemoryServer: ${memErr.message}`);
        throw memErr;
      }
    } else {
      throw err;
    }
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
