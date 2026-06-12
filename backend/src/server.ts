import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import partyRoutes from './routes/party.routes';
import partyContactRoutes from './routes/partyContact.routes';
import uploadRoutes from './routes/upload.routes';
import userMasterRoutes from './routes/userMaster.routes';
import umrahVisaRoutes from './routes/umrahVisa.routes';
import umrahVisaIndividualRoutes from './routes/umrahVisaIndividual.routes';
import umrahVisaGroupRoutes from './routes/umrahVisaGroup.routes';
import umrahVisaWorkflowRoutes from './routes/umrahVisaWorkflow.routes';
import umrahVisaInvoiceRoutes from './routes/umrahVisaInvoice.routes';
import voucherRoutes from './routes/voucher.routes';
import auditRoutes from './routes/audit.routes';
import currencyMasterRoutes from './routes/currencyMaster.routes';
import countryMasterRoutes from './routes/countryMaster.routes';
import cityMasterRoutes from './routes/cityMaster.routes';
import locationMasterRoutes from './routes/locationMaster.routes';
import userRoleMasterRoutes from './routes/userRoleMaster.routes';
import vehicleTypeMasterRoutes from './routes/vehicleTypeMaster.routes';
import transportRouteMasterRoutes from './routes/transportRouteMaster.routes';
import transportMasterRoutes from './routes/transportMaster.routes';
import pricingMasterRoutes from './routes/pricingMaster.routes';
import cancellationRoutes from './routes/cancellation.routes';
import notificationRoutes from './routes/notifications.routes';
import landingRoutes from './routes/landing.routes';
import umrahOperationalRoutes from './routes/umrahOperational.routes';

// Load environment variables based on environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(__dirname, '..', envFile);
const defaultEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[SERVER] Loading environment from ${envFile}`);
} else {
  dotenv.config({ path: defaultEnvPath });
  console.log(`[SERVER] Loading environment from .env (fallback)`);
}

const app: Application = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

console.log(`[SERVER] Configured CORS for origin: ${FRONTEND_URL}`);

// Body parser middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint for email and WhatsApp configuration (admin only in production)
app.get('/api/debug/services-config', (req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const authHeader = req.headers.authorization;
  
  // In production, require basic auth or skip if not needed
  // For now, allow in development, restrict in production
  if (!isDevelopment) {
    // You can add authentication here if needed
    // For security, consider removing this endpoint in production or adding proper auth
  }

  const config = {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    email: {
      smtpHost: process.env.SMTP_HOST || 'NOT SET',
      smtpPort: process.env.SMTP_PORT || 'NOT SET',
      smtpSecure: process.env.SMTP_SECURE || 'NOT SET',
      smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'NOT SET',
      smtpPassword: process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET',
      frontendUrl: process.env.FRONTEND_URL || 'NOT SET',
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    },
    whatsapp: {
      apiUrl: process.env.WHATSAPP_API_URL || 'https://wa.smsidea.com/api/v1/sendMessage',
      apiKey: process.env.WHATSAPP_API_KEY ? `${process.env.WHATSAPP_API_KEY.substring(0, 10)}***` : 'NOT SET',
      instanceId: process.env.WHATSAPP_INSTANCE_ID || 'NOT SET',
      configured: !!(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_INSTANCE_ID),
    },
  };

  res.json(config);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api', partyContactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userMasterRoutes);
// Register workflow routes first (more specific routes like /:bookingId/voucher-data)
// Then individual and group routes, then shared routes (less specific like /:bookingId)
app.use('/api/umrah-visa', umrahVisaWorkflowRoutes);
app.use('/api/umrah-visa', umrahVisaIndividualRoutes);
app.use('/api/umrah-visa', umrahVisaGroupRoutes);
app.use('/api/umrah-visa', umrahVisaRoutes);
app.use('/api/umrah-visa', umrahVisaInvoiceRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/currency-masters', currencyMasterRoutes);
app.use('/api/country-masters', countryMasterRoutes);
app.use('/api/city-masters', cityMasterRoutes);
app.use('/api/location-masters', locationMasterRoutes);
app.use('/api/user-role-masters', userRoleMasterRoutes);
app.use('/api/vehicle-type-masters', vehicleTypeMasterRoutes);
app.use('/api/transport-route-masters', transportRouteMasterRoutes);
app.use('/api/transport-masters', transportMasterRoutes);
app.use('/api/pricing-masters', pricingMasterRoutes);
app.use('/api/cancellation', cancellationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/landing', landingRoutes);
app.use('/api/umrah-visa/operational', umrahOperationalRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Check S3 configuration
  const { isS3Configured, getEndpoint } = require('./config/s3');
  if (isS3Configured()) {
    // Import getEndpoint function (we'll need to export it)
    const endpoint = getEndpoint() || 'AWS S3 (default)';
    const region = process.env.AWS_REGION || 'us-east-1';
    console.log(`☁️  S3 Storage: Configured (${process.env.S3_BUCKET_NAME})`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Region: ${region}`);
  } else {
    console.log(`📁 File Storage: Local (uploads/ directory)`);
    console.log(`💡 To use S3/Spaces, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME`);
  }

  // Check Email configuration
  const emailEnabled = process.env.EMAIL_ENABLED !== 'false';
  const emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  
  if (!emailEnabled) {
    console.log(`📧 Email Service: DISABLED (EMAIL_ENABLED=false)`);
    console.log(`   Email sending is disabled. WhatsApp messaging will continue to work.`);
  } else if (emailConfigured) {
    console.log(`📧 Email Service: Configured (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '587'})`);
  } else {
    console.log(`⚠️  Email Service: NOT CONFIGURED`);
    console.log(`   Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD`);
    console.log(`   Optional: SMTP_PORT, SMTP_SECURE, FRONTEND_URL, EMAIL_ENABLED`);
  }

  // Check WhatsApp configuration
  const whatsappConfigured = !!(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_INSTANCE_ID);
  if (whatsappConfigured) {
    console.log(`💬 WhatsApp Service: Configured`);
  } else {
    console.log(`⚠️  WhatsApp Service: NOT CONFIGURED`);
    console.log(`   Required: WHATSAPP_API_KEY, WHATSAPP_INSTANCE_ID`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
