import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { BullModule } from '@nestjs/bullmq'
import { APP_GUARD } from '@nestjs/core'
import configuration from './config/configuration'
import {
  AuthModule,
  LandmarksModule,
  ZodModule,
  RepositoryModule,
  PrismaModule,
  OverpassModule,
  WebhookModule,
  CacheServiceModule,
  HealthModule,
  LandmarksQueueModule,
} from './modules'
import { AuthGuard } from './controllers/guard/auth.guard'
import { createRedisCacheConfig } from './config/redis.config'

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
    // Apply AuthGuard globally - controllers can use @Public() to bypass
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
