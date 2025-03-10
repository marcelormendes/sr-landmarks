import { envSchema } from '../schemas/configuration.schema'
import { JWT_CONSTANTS } from '../constants/auth.constants'
import { Logger } from '@nestjs/common'
import { ErrorHandler } from 'src/exceptions/error-handling'
import { ConfigurationException } from 'src/exceptions/api.exceptions'

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
        timeout: 60000,
        maxRetries: 3,
      },
      api: {
        syncTimeout: 60000, // 60 seconds timeout for sync endpoint
      },
      worker: {
        lockDuration: 30000,
        stalledInterval: 15000,
        maxStalledCount: 3,
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
        url: env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
        timeout: env.OVERPASS_TIMEOUT || 60000,
        maxRetries: env.OVERPASS_MAX_RETRIES || 3,
      },
      api: {
        syncTimeout: env.API_SYNC_TIMEOUT || 60000, // 60 seconds timeout for sync endpoint
      },
      worker: {
        lockDuration: env.WORKER_LOCK_DURATION || 30000,
        stalledInterval: env.WORKER_STALLED_INTERVAL || 15000,
        maxStalledCount: env.WORKER_MAX_STALLED_COUNT || 3,
      },
    }
  } catch (error: unknown) {
    const logger = new Logger('Configuration')
    ErrorHandler.handle(error, ConfigurationException, {
      context: 'Configuration',
      logger: logger,
    })
  }
}
