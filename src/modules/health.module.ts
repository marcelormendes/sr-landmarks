import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from '../controllers/health/health.controller'
import { RedisHealthIndicator } from '../controllers/health/redis.health'
import { QueueHealthIndicator } from '../controllers/health/queue.health'
import { PrismaModule } from './prisma.module'
import { BullModule } from '@nestjs/bullmq'
import { CacheServiceModule } from './cache.module'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../app.module'

@Module({
  imports: [
    TerminusModule,
    PrismaModule,
    CacheServiceModule, // Import the cache module to get access to Redis
    BullModule.registerQueue({
      name: 'landmarks',
    }),
  ],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    QueueHealthIndicator,
    // Provide a dedicated Redis client for health checks
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        try {
          console.log('Creating dedicated Redis client for health module')
          return new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          })
        } catch (error) {
          console.error(
            'Failed to create Redis client for health module:',
            error,
          )
          return null
        }
      },
    },
  ],
})
export class HealthModule {}
