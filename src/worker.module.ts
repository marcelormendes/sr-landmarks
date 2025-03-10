import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import configuration from './config/configuration'
import { createRedisCacheConfig } from './config/redis.config'
import { RepositoryModule } from './repositories/repository.module'
import { HealthModule } from './controllers/health/health.module'
import { PrismaModule } from './services/prisma.module'
import { OverpassModule } from './services/overpass/overpass.module'
import { LandmarksModule } from './services/landmarks/landmarks.module'
import { LandmarksQueueModule } from './services/landmarks/queue/landmarks-queue.module'

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
    RepositoryModule,
    OverpassModule,
    LandmarksModule,
    LandmarksQueueModule,
    HealthModule,
  ],
})
export class WorkerModule {}
