import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables from root .env or apps/backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

function secret(name: string): string {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 32)) throw new Error(`${name} must be configured with at least 32 characters`);
  return value || crypto.randomBytes(32).toString('hex');
}
export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/peoplecore?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwt: {
    secret: secret('JWT_SECRET'),
    refreshSecret: secret('JWT_REFRESH_SECRET'),
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  services: {
    payrollUrl: process.env.PAYROLL_SERVICE_URL || 'http://localhost:8001',
    analyticsUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8002',
    internalToken: secret('INTERNAL_SERVICE_TOKEN'),
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: path.resolve(__dirname, '../../../../storage'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },

  organization: {
    name: process.env.ORGANIZATION_NAME || 'PeopleCore Technologies Inc.',
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    currency: process.env.DEFAULT_CURRENCY || 'INR',
  }
};
