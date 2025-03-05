import { Injectable, Logger, Optional } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../../app.module'

// Define types for internal cache store structure
interface RedisStore {
  client?: Redis
  getClient?: () => Redis
}

interface CacheManagerWithStore extends Cache {
  store?: RedisStore
}

/**
 * Health indicator for Redis connection.
 * Tests Redis connectivity by performing simple cache operations.
 */
@Injectable()
export class RedisHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name)
  private redis: Redis | null = null

  /**
   * @param cacheManager Cache manager instance
   */
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheManagerWithStore,
    @Inject(REDIS_CLIENT) @Optional() private injectedRedis?: Redis,
  ) {
    // Use the injected Redis client if available
    if (this.injectedRedis) {
      this.redis = this.injectedRedis
      this.logger.log('Using injected Redis client')
      return
    }

    // Try to access the Redis client from the cache manager
    try {
      // We need to access the store which may contain Redis client
      const store = this.cacheManager.store

      // Type-safe checks to ensure we have the properties we need
      if (store) {
        // Safe way to check if client property exists and then access it
        if (store.client instanceof Redis) {
          this.redis = store.client
          this.logger.log(
            'Successfully accessed Redis client from cache manager',
          )
        }
        // Safe way to check if getClient method exists and call it
        else if (store.getClient && typeof store.getClient === 'function') {
          try {
            // Call the getClient method
            const client = store.getClient()

            if (client instanceof Redis) {
              this.redis = client
              this.logger.log(
                'Successfully retrieved Redis client from cache manager',
              )
            }
          } catch (redisError) {
            this.logger.error('Error calling getClient method', redisError)
          }
        }
      } else {
        this.logger.warn('Could not access Redis client directly')
      }
    } catch (error) {
      this.logger.error(
        `Error accessing Redis client: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Checks if Redis is healthy by setting and retrieving a test value
   *
   * @param key - The key to use in the health check result
   * @returns Promise resolving to a health indicator result object
   */
  async checkHealth(key: string): Promise<HealthIndicatorResult> {
    try {
      // Attempt to set and get a value to check Redis connection
      const testKey = `health-check-${Date.now()}`
      await this.cacheManager.set(testKey, 'health-check', 10000)
      await this.cacheManager.get(testKey)

      return {
        [key]: {
          status: 'up',
        },
      }
    } catch (error: unknown) {
      this.logger.error('Redis health check failed', error)
      return {
        [key]: {
          status: 'down',
          message: 'Redis health check failed',
        },
      }
    }
  }

  /**
   * Test Redis connection by directly setting a value and retrieving it
   */
  async testRedisConnection(): Promise<boolean> {
    if (!this.redis && !this.injectedRedis) {
      this.logger.error(
        'Cannot test Redis connection - no Redis client available',
      )
      return false
    }

    // Use either the detected redis client or the injected one
    // This should never be undefined based on our previous check, but TypeScript needs the assertion
    const client = this.redis || this.injectedRedis!

    try {
      const testKey = `redis-test-${Date.now()}`
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() })

      this.logger.log(`Testing Redis connection by setting key: ${testKey}`)
      await client.set(testKey, testValue, 'EX', 60)

      const result = await client.get(testKey)
      if (result) {
        this.logger.log('Redis connection test successful')
        return true
      } else {
        this.logger.error('Redis connection test failed: No value returned')
        return false
      }
    } catch (error) {
      this.logger.error(
        `Redis connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  /**
   * Get all Redis keys matching a pattern
   */
  async getRedisKeys(
    pattern: string,
  ): Promise<{ keys: string[]; count: number }> {
    if (!this.redis && !this.injectedRedis) {
      this.logger.error('Cannot get Redis keys - no Redis client available')
      return { keys: [], count: 0 }
    }

    // Use either the detected redis client or the injected one
    // This should never be undefined based on our previous check, but TypeScript needs the assertion
    const client = this.redis || this.injectedRedis!

    try {
      this.logger.log(`Getting Redis keys matching pattern: ${pattern}`)
      const keys = await client.keys(pattern)

      // Get values for the first 10 keys as samples
      const sampleKeys = keys.slice(0, 10)
      const samples: Record<string, string> = {}

      if (sampleKeys.length > 0) {
        for (const key of sampleKeys) {
          const value = await client.get(key)
          if (value) {
            samples[key] =
              value.length > 100
                ? `${value.substring(0, 100)}... (truncated)`
                : value
          }
        }
      }

      return {
        keys: keys,
        count: keys.length,
      }
    } catch (error) {
      this.logger.error(
        `Error getting Redis keys: ${error instanceof Error ? error.message : String(error)}`,
      )
      return { keys: [], count: 0 }
    }
  }
}
