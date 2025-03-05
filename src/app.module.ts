import { Module, Provider } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { BullModule } from '@nestjs/bullmq'
import { APP_GUARD } from '@nestjs/core'
import configuration from './config/configuration'
// Create a global Redis provider that can be injected anywhere
import { Redis } from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (_configService: ConfigService) => {
    const redisHost = process.env.REDIS_HOST || 'localhost'
    const redisPort = parseInt(process.env.REDIS_PORT || '6379')

    console.log(`Creating global Redis client: ${redisHost}:${redisPort}`)

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
      console.log('Global Redis client connected')
    })

    redis.on('error', (err) => {
      console.error(`Global Redis client error: ${err.message}`)
    })

    return redis
  },
  inject: [ConfigService],
}
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        // Log Redis connection info for debugging
        console.log(
          `Redis connection: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        )
        console.log(`Redis TTL: ${process.env.REDIS_TTL} seconds`)

        return {
          ttl: parseInt(process.env.REDIS_TTL || '3600'),
          max: 1000,
          isGlobal: true,
          store: {
            create: () => {
              console.log('Creating Redis client with connection info:')
              console.log(`Host: ${process.env.REDIS_HOST}`)
              console.log(`Port: ${process.env.REDIS_PORT}`)

              const redis = new Redis({
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '6379'),
                reconnectOnError: (err) => {
                  console.log(`Redis connection error: ${err.message}`)
                  return true // Always reconnect
                },
                retryStrategy: (times) => {
                  console.log(`Retrying Redis connection, attempt #${times}`)
                  return Math.min(times * 100, 3000) // Wait max 3 seconds
                },
              })

              return {
                async get(key) {
                  const prefixedKey = `cache:${key}`
                  console.log(`Redis GET: ${prefixedKey}`)
                  const result = await redis.get(prefixedKey)
                  console.log(
                    `Redis GET result for ${prefixedKey}: ${result ? 'hit' : 'miss'}`,
                  )
                  return result ? (JSON.parse(result) as unknown) : null
                },
                async set(key, value, ttl) {
                  const prefixedKey = `cache:${key}`
                  console.log(
                    `Redis SET: ${prefixedKey}, TTL: ${ttl || parseInt(process.env.REDIS_TTL || '3600')}`,
                  )
                  const ttlValue = ttl
                    ? Number(ttl)
                    : parseInt(process.env.REDIS_TTL || '3600')
                  await redis.set(
                    prefixedKey,
                    JSON.stringify(value),
                    'EX',
                    ttlValue,
                  )
                  // Verify the data was stored
                  const verifyResult = await redis.get(prefixedKey)
                  console.log(
                    `Redis SET verification for ${prefixedKey}: ${verifyResult ? 'success' : 'failed'}`,
                  )
                },
                async del(key) {
                  const prefixedKey = `cache:${key}`
                  console.log(`Redis DEL: ${prefixedKey}`)
                  await redis.del(prefixedKey)
                },
                async reset() {
                  console.log('Redis RESET: Flushing all cache keys')
                  // Only delete keys with our prefix
                  const keys = await redis.keys('cache:*')
                  if (keys.length > 0) {
                    await redis.del(...keys)
                  }
                },
              }
            },
          },
        }
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_configService: ConfigService) => {
        console.log('Configuring BullMQ Redis connection:')
        console.log(`Host: ${process.env.REDIS_HOST}`)
        console.log(`Port: ${process.env.REDIS_PORT}`)

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
    // Provide the global Redis client
    RedisProvider,
  ],
})
export class AppModule {}
