import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import configuration from './common/config/configuration'
import { createRedisCacheConfig } from '@common/config/redis.config'
import { HealthModule } from '@common/health/health.module'
import { PrismaModule } from '@common/prisma/prisma.module'
import { OverpassModule } from '@modules/overpass/overpass.module'
import { LandmarksModule } from '@modules/landmarks/landmarks.module'
import { LandmarksQueueModule } from '@modules/queue/queue.module'
import { WebhookModule } from '@modules/webhook/webhook.module'

/**
 * Minimal module for worker-only instances
 * Contains only the modules needed for processing jobs from the queue
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Cache
    CacheModule.registerAsync(createRedisCacheConfig()),

    // Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<{
          host: string
          port: number
        }>('redis')

        if (!redisConfig) {
          throw new Error('Redis configuration is missing')
        }

        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
          },
          // Worker-specific settings
          worker: {
            lockDuration: configService.get<number>('worker.lockDuration'),
            stalledInterval: configService.get<number>(
              'worker.stalledInterval',
            ),
            maxStalledCount: configService.get<number>(
              'worker.maxStalledCount',
            ),
          },
        }
      },
    }),

    // Core modules needed for job processing
    PrismaModule,
    TerminusModule,
    WebhookModule,
    OverpassModule,
    LandmarksModule,
    LandmarksQueueModule,
    HealthModule,
  ],
})
export class WorkerModule {}
