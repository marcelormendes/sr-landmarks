import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Injectable, Inject, Logger, Optional } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../app.module'

/**
 * Service providing type-safe wrapper around cache operations.
 * Handles error handling and logging for cache operations.
 */

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REDIS_CLIENT) @Optional() private redisClient?: Redis,
  ) {
    // Test cache connection on startup
    this.testCacheConnection().catch((err) => {
      this.logger.error(
        `Failed to connect to cache: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    })

    // Test direct Redis connection if available
    if (this.redisClient) {
      this.testDirectRedisConnection().catch((err) => {
        this.logger.error(
          `Failed to connect directly to Redis: ${err instanceof Error ? err.message : 'Unknown error'}`,
        )
      })
    } else {
      this.logger.warn(
        'No direct Redis client available - using only cache manager',
      )
    }
  }

  /**
   * Test the direct Redis connection
   */
  async testDirectRedisConnection(): Promise<boolean> {
    if (!this.redisClient) {
      this.logger.warn(
        'Direct Redis client not available, skipping direct connection test',
      )
      return false
    }

    try {
      const testKey = `direct-redis-test-${Date.now()}`
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() })

      this.logger.log('Testing direct Redis connection...')
      await this.redisClient.set(testKey, testValue, 'EX', 60)

      const result = await this.redisClient.get(testKey)

      if (result) {
        this.logger.log('Direct Redis connection test successful')
        return true
      } else {
        this.logger.error(
          'Direct Redis connection test failed: No value returned',
        )
        return false
      }
    } catch (error) {
      this.logger.error(
        `Direct Redis connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  // Test the cache connection by setting and getting a test value
  async testCacheConnection(): Promise<boolean> {
    try {
      const testKey = `test-connection-${Date.now()}`
      const testValue = { test: true, timestamp: Date.now() }

      this.logger.log('Testing cache connection...')
      await this.set(testKey, testValue, 60) // 1 minute TTL

      const result = await this.get<typeof testValue>(testKey)

      if (result && result.test === true) {
        this.logger.log('Cache connection test successful')
        return true
      } else {
        this.logger.error(
          'Cache connection test failed: Data mismatch or missing',
        )
        return false
      }
    } catch (error) {
      this.logger.error(
        `Cache connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      this.logger.debug(`Attempting to get from cache: ${key}`)

      // First try with the cache manager
      const result = await this.cacheManager.get<T>(key)
      this.logger.debug(`Cache ${result ? 'HIT' : 'MISS'} for key: ${key}`)

      // If cache miss and we have direct Redis access, try that with our prefix
      if (!result && this.redisClient) {
        try {
          const directKey = `cache:${key}`
          this.logger.debug(`Trying direct Redis access for: ${directKey}`)
          const directResult = await this.redisClient.get(directKey)

          if (directResult) {
            this.logger.debug(`Direct Redis HIT for key: ${directKey}`)
            const parsedResult = JSON.parse(directResult) as T
            // Store it back in the cache manager for future use
            await this.cacheManager.set(key, parsedResult)
            return parsedResult
          }
        } catch (redisError) {
          this.logger.error(
            `Direct Redis GET error: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }

      // Log more details about the cache result
      if (result) {
        this.logger.debug(
          `Cache hit details: Type: ${typeof result}, Size: ${JSON.stringify(result).length} bytes`,
        )
      }

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Cache GET error for key ${key}: ${errorMessage}`)
      this.logger.error(
        `Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`,
      )

      // As a last resort, try direct Redis access if available
      if (this.redisClient) {
        try {
          const directKey = `cache:${key}`
          this.logger.debug(`Last resort direct Redis access for: ${directKey}`)
          const directResult = await this.redisClient.get(directKey)

          if (directResult) {
            this.logger.debug(
              `Last resort direct Redis HIT for key: ${directKey}`,
            )
            return JSON.parse(directResult) as T
          }
        } catch (redisError) {
          this.logger.error(
            `Last resort direct Redis error: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }

      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlValue = ttl || parseInt(process.env.REDIS_TTL || '3600')

    try {
      this.logger.debug(`Attempting to set cache: ${key}, TTL: ${ttlValue}`)
      this.logger.debug(
        `Cache value type: ${typeof value}, size: ${JSON.stringify(value).length} bytes`,
      )

      // Set in cache manager
      await this.cacheManager.set(key, value, ttlValue)

      // Also set directly in Redis with our prefix as a backup if available
      if (this.redisClient) {
        try {
          const directKey = `cache:${key}`
          await this.redisClient.set(
            directKey,
            JSON.stringify(value),
            'EX',
            ttlValue,
          )
          this.logger.debug(`Also set directly in Redis: ${directKey}`)
        } catch (redisError) {
          this.logger.error(
            `Direct Redis SET error: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }

      // Verify the data was actually stored in cache manager
      const verifyResult = await this.cacheManager.get<T>(key)
      if (verifyResult) {
        this.logger.debug(
          `Successfully set cache for ${key} (verified in cache manager)`,
        )
      } else {
        this.logger.warn(`Cache manager set for ${key} but verification failed`)

        // Verify the direct Redis set worked if available
        if (this.redisClient) {
          try {
            const directKey = `cache:${key}`
            const directVerify = await this.redisClient.get(directKey)
            if (directVerify) {
              this.logger.debug(
                `Successfully set cache for ${directKey} (verified in direct Redis)`,
              )
            } else {
              this.logger.warn(
                `Direct Redis set for ${directKey} but verification failed`,
              )
            }
          } catch (redisError) {
            this.logger.error(
              `Direct Redis verify error: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
            )
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Cache SET error for key ${key}: ${errorMessage}`)
      this.logger.error(
        `Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`,
      )

      // As a last resort, try direct Redis set if available
      if (this.redisClient) {
        try {
          const directKey = `cache:${key}`
          this.logger.debug(`Last resort direct Redis set for: ${directKey}`)
          await this.redisClient.set(
            directKey,
            JSON.stringify(value),
            'EX',
            ttlValue,
          )
        } catch (redisError) {
          this.logger.error(
            `Last resort direct Redis set error: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }
    }
  }
}
