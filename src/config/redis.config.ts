import { ConfigModule, ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'

export function createRedisCacheConfig() {
  return {
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
              connectTimeout: 5000, // Increase timeout to 5 seconds
              maxRetriesPerRequest: 5, // Increase retries per request
              reconnectOnError: (err) => {
                console.log(`Redis connection error: ${err.message}`)
                return true // Always reconnect
              },
              retryStrategy: (times) => {
                console.log(`Retrying Redis connection, attempt #${times}`)
                const delay = Math.min(times * 500, 5000) // Wait max 5 seconds between retries
                console.log(`Next retry in ${delay}ms`)
                return delay
              },
            })

            // Add error event handler
            redis.on('error', (err) => {
              console.error('Redis client error:', err)
            })

            // Add ready event handler
            redis.on('ready', () => {
              console.log('Redis client ready')
            })

            // Add connect event handler
            redis.on('connect', () => {
              console.log('Redis client connected')
            })

            // Add reconnecting event handler
            redis.on('reconnecting', () => {
              console.log('Redis client reconnecting')
            })

            return {
              async get(key) {
                const prefixedKey = `cache:${key}`
                console.log(`Redis GET: ${prefixedKey}`)
                const result = await redis.get(prefixedKey)
                console.log(
                  `Redis GET result for ${prefixedKey}: ${result ? 'hit' : 'miss'}`,
                )
                return result ? (JSON.parse(result) as unknown) : undefined
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
  }
}
