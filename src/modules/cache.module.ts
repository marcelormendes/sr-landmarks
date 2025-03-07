import { Global, Module } from '@nestjs/common'
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
        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost'
        const redisPort = parseInt(
          configService.get<string>('REDIS_PORT') || '6379',
        )

        console.log(`Creating Redis client: ${redisHost}:${redisPort}`)

        const redis = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 5,
          retryStrategy: (times) => {
            console.log(`Redis connection retry #${times}`)
            return Math.min(times * 100, 3000)
          },
          reconnectOnError: (err) => {
            console.log(`Redis connection error: ${err.message}`)
            return true
          },
        })

        redis.on('connect', () => {
          console.log('Redis client connected')
        })

        redis.on('error', (err) => {
          console.error(`Redis client error: ${err.message}`)
        })

        return redis
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheServiceModule {}
