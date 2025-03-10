import { Global, Module, Logger } from '@nestjs/common'
import { CacheService } from '../services/cache.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../constants/tokens'

/**
 * Global module providing enhanced cache functionality
 * Provides both CacheService and Redis client
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CacheService,
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('CacheModule')
        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost'
        const redisPort = parseInt(
          configService.get<string>('REDIS_PORT') || '6379',
        )

        const redis = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 5,
          retryStrategy: (times) => {
            return Math.min(times * 100, 3000)
          },
          reconnectOnError: (_err) => {
            return true
          },
        })

        redis.on('connect', () => {
          logger.log('Redis client connected')
        })

        redis.on('error', (err) => {
          logger.error(`Redis client error: ${err.message}`)
        })

        return redis
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheServiceModule {}
