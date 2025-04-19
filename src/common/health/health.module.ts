import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { RedisHealthIndicator } from './redis.health'
import { QueueHealthIndicator } from './queue.health'
import { PrismaModule } from '@common/prisma/prisma.module'
import { BullModule } from '@nestjs/bullmq'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '@shared/constants/tokens'

@Module({
  imports: [
    TerminusModule,
    PrismaModule,
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
          return new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          })
        } catch (error) {
          console.error(
            'Failed to create Redis client for health module:',
            error,
          )
          return undefined
        }
      },
    },
  ],
})
export class HealthModule {}
