import { JWT_CONSTANTS } from '../constants/auth.constants'
// z is imported but not used, removing to fix lint error
import { z } from 'zod'

// Define schema for environment validation
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3000'),
  DATABASE_FILE: z.string().default('landmarks.sqlite'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('6379'),
  REDIS_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3600'),
  JWT_SECRET: z.union([
    z.string().min(16),
    z.literal(undefined),
    z.literal(''),
  ]),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  OVERPASS_URL: z
    .string()
    .url()
    .default('https://overpass-api.de/api/interpreter'),
  OVERPASS_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('30000'),
  OVERPASS_MAX_RETRIES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3'),
})

export default () => {
  // Check if we're in test mode
  if (process.env.NODE_ENV === 'test') {
    // Use default values for testing
    return {
      env: 'test',
      port: 3001,
      database: {
        type: 'sqlite',
        database: 'test.sqlite',
        synchronize: true,
      },
      redis: {
        host: 'localhost',
        port: 6379,
        ttl: 3600, // in seconds
      },
      jwt: {
        secret: 'test-secret-key-1234567890-test-secret-key-1234567890',
      },
      cors: {
        allowedOrigins: '*',
      },
      overpass: {
        url: 'https://overpass-api.de/api/interpreter',
        timeout: 30000,
        maxRetries: 3,
      },
    }
  }

  // Parse and validate environment variables for non-test environments
  try {
    const env = envSchema.parse(process.env)
    return {
      env: env.NODE_ENV,
      port: env.PORT,
      database: {
        type: 'sqlite',
        database: env.DATABASE_FILE,
        synchronize: env.NODE_ENV !== 'production',
      },
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        ttl: env.REDIS_TTL, // in seconds
      },
      jwt: {
        secret: env.JWT_SECRET || JWT_CONSTANTS.secret,
      },
      cors: {
        allowedOrigins:
          env.CORS_ALLOWED_ORIGINS ||
          (env.NODE_ENV === 'production' ? undefined : '*'),
      },
      overpass: {
        url: env.OVERPASS_URL,
        timeout: env.OVERPASS_TIMEOUT,
        maxRetries: env.OVERPASS_MAX_RETRIES,
      },
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('Configuration validation failed:', err.message)
    throw new Error('Application cannot start due to configuration errors')
  }
}
