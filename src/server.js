const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB } = require('./database/connection');
const { initSocket } = require('./sockets/socketManager');
const { seedDataIfEmpty } = require('./database/seed');
const { ensureTaxInvoiceUser } = require('./database/ensureTaxUser');

const startServer = async () => {
  try {
    // 1. Connect to Database (auto-fallback to embedded memory server if offline)
    await connectDB();

    // 2. High-speed database seed if collections are empty
    await seedDataIfEmpty();

    // 2.1 Ensure dedicated Tax Invoice Specialist account exists
    await ensureTaxInvoiceUser();

    // 3. Create HTTP Server and bind Socket.IO
    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(` PMS Multi-Tenant Backend Server Running on Port: ${env.PORT} `);
      logger.info(` REST API:      http://localhost:${env.PORT}/api/v1/health`);
      logger.info(` Swagger Docs:  http://localhost:${env.PORT}/api-docs`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server: %o', error);
    process.exit(1);
  }
};

startServer();
