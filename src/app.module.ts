import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { BullModule } from '@nestjs/bullmq'
import { APP_GUARD } from '@nestjs/core'
import configuration from './config/configuration'
import { AuthModule } from './services/auth/auth.module'
import { HealthModule } from './controllers/health/health.module'
import { ZodModule } from './schemas/zod.module'
import { RepositoryModule } from './repositories/repository.module'
import { AuthGuard } from './controllers/guard/auth.guard'
import { createRedisCacheConfig } from './config/redis.config'
import { LandmarksModule } from './services/landmarks/landmarks.module'
import { PrismaModule } from './services/prisma.module'
import { OverpassModule } from './services/overpass/overpass.module'
import { WebhookModule } from './services/webhook/webhook.module'
import { CacheServiceModule } from './services/cache.module'
import { LandmarksQueueModule } from './services/landmarks/queue/landmarks-queue.module'

@Module({
  imports: [
    AuthModule,
    CacheServiceModule,
    LandmarksQueueModule,
    LandmarksModule,
    OverpassModule,
    RepositoryModule,
    WebhookModule,
    PrismaModule,
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ZodModule,
    CacheModule.registerAsync(createRedisCacheConfig()),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        return {
          connection: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        }
      },
    }),
  ],
  providers: [
    Logger,
    // Apply AuthGuard globally - controllers can use @Public() to bypass
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
