import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config, isDevelopment, isProduction } from './lib/config';
import { initializeDatabase, healthCheck } from './lib/db';
import {
  errorHandler,
  notFoundHandler,
  sendSuccess,
  API_PATHS
} from './lib/api-conventions';

const app = express();
const PORT = config.port;

// Trust proxy (needed for correct req.secure and X-Forwarded-* handling behind reverse proxies)
if (isProduction()) {
  app.set('trust proxy', 1);
  // Enforce HTTPS in production
  app.use((req, res, next) => {
    const xfProto = req.headers['x-forwarded-proto'];
    const isHttps = req.secure || xfProto === 'https';
    if (isHttps) return next();
    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

// Security headers (enable HSTS only in production)
app.use(helmet({
  hsts: isProduction() ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(compression());
app.use(morgan(isDevelopment() ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database connection
initializeDatabase();

// Health check endpoint
app.get(API_PATHS.SYSTEM.HEALTH, async (_req, res) => {
  try {
    const dbHealthy = await healthCheck();
    sendSuccess(res, {
      status: 'ok',
      database: dbHealthy ? 'connected' : 'disconnected',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  } catch (error) {
    sendSuccess(res, {
      status: 'error',
      database: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Version endpoint
app.get(API_PATHS.SYSTEM.VERSION, (_req, res) => {
  sendSuccess(res, {
    version: '1.0.0',
    name: 'ChitJar API',
    environment: config.nodeEnv,
  });
});

// API routes will be added here
import { router as authRoutes } from './api/auth';
import { router as fundsRoutes } from './api/funds';
import { router as entriesRoutes } from './api/monthly-entries';
import { router as bidsRoutes } from './api/bids';
import { router as exportRoutes } from './api/export';
import { router as analyticsRoutes } from './api/analytics';
app.use(API_PATHS.AUTH.BASE, authRoutes);
app.use(API_PATHS.FUNDS.BASE, fundsRoutes);
app.use(API_PATHS.ENTRIES.BASE, entriesRoutes);
app.use(API_PATHS.BIDS.BASE, bidsRoutes);
// Additional mounting for nested fund routes
app.use('/api/v1', entriesRoutes);
app.use('/api/v1', bidsRoutes);
app.use(API_PATHS.IMPORT_EXPORT.EXPORT_FUNDS.replace('/api/v1/export/funds', '/api/v1/export'), exportRoutes);
app.use(API_PATHS.ANALYTICS.BASE, analyticsRoutes);

// Global error handling middleware
app.use(errorHandler);

// 404 handler (must be last)
app.use('*', notFoundHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Export app for testing
export { app };
