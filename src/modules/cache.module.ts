import { Module } from '@nestjs/common'
import { CacheService } from '../services/cache.service'
import { ConfigModule } from '@nestjs/config'
import { REDIS_CLIENT } from '../app.module'
import { Redis } from 'ioredis'

/**
 * Module providing enhanced cache functionality
 * Builds on top of NestJS CacheModule with additional features
 */
@Module({
  imports: [
    ConfigModule, // For configuration access
  ],
  providers: [
    CacheService,
    // Provide a fallback Redis client in case the global one is not available
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        try {
          console.log('Creating fallback Redis client in CacheServiceModule')
          const redisHost = process.env.REDIS_HOST || 'localhost'
          const redisPort = parseInt(process.env.REDIS_PORT || '6379')

          return new Redis({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: 3,
          })
        } catch (error) {
          console.error('Failed to create fallback Redis client:', error)
          return undefined
        }
      },
    },
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheServiceModule {}
