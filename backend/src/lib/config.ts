import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables based on NODE_ENV
const envFile = process.env['NODE_ENV'] === 'test' ? 'env.test' : '.env';
dotenv.config({ path: envFile });

// Configuration schema validation
const configSchema = z.object({
  // Server
  port: z.string().transform(Number).default('5000'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  databaseUrl: z.string().url(),
  databaseTestUrl: z.string().url().optional(),
  
  // Authentication
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().default('1h'),
  jwtRefreshSecret: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  jwtRefreshExpiresIn: z.string().default('7d'),
  bcryptRounds: z.string().transform(Number).default('12'),
  
  // Security
  rateLimitWindowMs: z.string().transform(Number).default('900000'),
  rateLimitMaxRequests: z.string().transform(Number).default('100'),
  corsOrigin: z.string().default('http://localhost:3000'),
  
  // File Upload
  maxFileSize: z.string().transform(Number).default('10485760'),
  uploadPath: z.string().default('./uploads'),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFile: z.string().default('./logs/app.log'),
  
  // Monitoring
  enableMetrics: z.string().transform(val => val === 'true').default('false'),
  metricsPort: z.string().transform(Number).default('9090'),
});

/**
 * Parse and validate configuration
 * Loads environment variables and validates them against the schema
 * @returns Validated configuration object
 * @throws Error if configuration validation fails
 */
const parseConfig = () => {
  try {
    const config = configSchema.parse({
      port: process.env['PORT'],
      nodeEnv: process.env['NODE_ENV'],
      databaseUrl: process.env['DATABASE_URL'],
      databaseTestUrl: process.env['DATABASE_TEST_URL'],
      jwtSecret: process.env['JWT_SECRET'],
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'],
      jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'],
      jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'],
      bcryptRounds: process.env['BCRYPT_ROUNDS'],
      rateLimitWindowMs: process.env['RATE_LIMIT_WINDOW_MS'],
      rateLimitMaxRequests: process.env['RATE_LIMIT_MAX_REQUESTS'],
      corsOrigin: process.env['CORS_ORIGIN'],
      maxFileSize: process.env['MAX_FILE_SIZE'],
      uploadPath: process.env['UPLOAD_PATH'],
      logLevel: process.env['LOG_LEVEL'],
      logFile: process.env['LOG_FILE'],
      enableMetrics: process.env['ENABLE_METRICS'],
      metricsPort: process.env['METRICS_PORT'],
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your environment variables and try again.');
    } else {
      console.error('Configuration error:', error);
    }
    process.exit(1);
  }
};

// Export validated configuration
export const config = parseConfig();

// Type for the configuration
export type Config = typeof config;

// Helper functions
/**
 * Check if the application is running in development mode
 * @returns True if NODE_ENV is 'development', false otherwise
 */
export const isDevelopment = () => config.nodeEnv === 'development';

/**
 * Check if the application is running in production mode
 * @returns True if NODE_ENV is 'production', false otherwise
 */
export const isProduction = () => config.nodeEnv === 'production';

/**
 * Check if the application is running in test mode
 * @returns True if NODE_ENV is 'test', false otherwise
 */
export const isTest = () => config.nodeEnv === 'test';

/**
 * Get the appropriate database URL based on the environment
 * @returns Database URL for the current environment
 */
export const getDatabaseUrl = () => {
  if (isTest() && config.databaseTestUrl) {
    return config.databaseTestUrl;
  }
  return config.databaseUrl;
};

// Database configuration object for use in db.ts
export const databaseConfig = {
  url: getDatabaseUrl(),
  ssl: isProduction(), // Enable SSL in production
};
