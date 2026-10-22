const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const logger = require('./config/logger');
const { swaggerUi, swaggerDocs } = require('./docs/swagger');
const { sendError } = require('./utils/responseFormatter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const platformRoutes = require('./routes/platformRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const apartmentRoutes = require('./routes/apartmentRoutes');
const commercialRoutes = require('./routes/commercialRoutes');
const coworkingRoutes = require('./routes/coworkingRoutes');
const operationsRoutes = require('./routes/operationsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const structureRoutes = require('./routes/structureRoutes');
const occupancyRoutes = require('./routes/occupancyRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const cctvRoutes = require('./routes/cctvRoutes');
const taxInvoiceRoutes = require('./routes/taxInvoiceRoutes');
const { handleCashfreeWebhook } = require('./controllers/taxWebhookController');

const app = express();

// Security & Core Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logger
app.use(morgan('dev'));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'PMS Multi-Tenant Backend API'
  });
});

// Cashfree Webhooks (registered before authenticated routes)
app.post('/api/v1/webhooks/cashfree', handleCashfreeWebhook);
app.post('/api/webhooks/cashfree', handleCashfreeWebhook);

// API Routes
app.use('/api/v1/tax-invoices', taxInvoiceRoutes);
app.use('/api/tax-invoices', taxInvoiceRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/rbac', rbacRoutes);
app.use('/api/v1/apartments', apartmentRoutes);
app.use('/api/v1/commercial', commercialRoutes);
app.use('/api/v1/coworking', coworkingRoutes);
app.use('/api/v1/operations', operationsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/structure', structureRoutes);
app.use('/api/v1/occupancies', occupancyRoutes);
app.use('/api/v1/visitors', visitorRoutes);
app.use('/api/v1/cctv', cctvRoutes);
app.use('/api/cctv', cctvRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  sendError(res, `Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND');
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Exception: %o', err);
  sendError(res, err.message || 'Internal Server Error', err.status || 500, err.code || 'INTERNAL_ERROR');
});

module.exports = app;
