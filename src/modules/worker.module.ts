import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import configuration from '../config/configuration'
import { LandmarksQueueModule } from './landmarks-queue.module'
import { LandmarksModule } from './landmarks.module'
import { RepositoryModule } from './repository.module'
import { PrismaModule } from './prisma.module'
import { HealthModule } from './health.module'
import { OverpassModule } from './overpass.module'
import { createKeyv } from '@keyv/redis'

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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<{
          host: string
          port: number
          ttl: number
        }>('redis')

        if (!redisConfig) {
          throw new Error('Redis configuration is missing')
        }

        return {
          store: createKeyv(`redis://${redisConfig.host}:${redisConfig.port}`),
          ttl: redisConfig.ttl,
        }
      },
    }),

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
            lockDuration: 30000, // 30 seconds
            stalledInterval: 15000, // Check for stalled jobs every 15 seconds
            maxStalledCount: 3, // Allow 3 stalls before marking as failed
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
