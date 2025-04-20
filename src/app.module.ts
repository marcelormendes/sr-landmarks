import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { BullModule } from '@nestjs/bullmq'
import { APP_GUARD } from '@nestjs/core'
import configuration from '@common/config/configuration'
import { AuthModule } from '@modules/auth/auth.module'
import { HealthModule } from '@common/health/health.module'
import { ZodModule } from '@common/pipes/zod.module'
import { AuthGuard } from '@common/guards/auth.guard'
import { createRedisCacheConfig } from '@common/config/redis.config'
import { LandmarksModule } from '@modules/landmarks/landmarks.module'
import { PrismaModule } from '@common/prisma/prisma.module'
import { WebhookModule } from '@modules/webhook/webhook.module'
import { CacheServiceModule } from '@common/cache/cache.module'
import { OverpassModule } from '@modules/overpass/overpass.module'
import { LandmarkRepositoryModule } from '@modules/landmarks/landmark.repository.module'
import { WebhookRepositoryModule } from '@modules/webhook/webhook-request.repository.module'

@Module({
  imports: [
    AuthModule,
    CacheServiceModule,
    LandmarksModule,
    WebhookModule,
    LandmarkRepositoryModule,
    WebhookRepositoryModule,
    PrismaModule,
    HealthModule,
    OverpassModule,
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
