import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Injectable, Inject, Logger, Optional } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../constants/tokens'

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
  ) {}
  /**
   * Retrieve an item from the cache
   */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      // First try with the cache manager
      const result = await this.cacheManager.get<T>(key)

      if (result) {
        this.logger.debug(`Cache HIT: ${key}`)
        return result
      }

      this.logger.debug(`Cache MISS: ${key}`)
      // If cache miss and we have direct Redis access, try that with our prefix
      if (this.redisClient) {
        try {
          const directKey = `cache:${key}`
          const directResult = await this.redisClient.get(directKey)

          if (directResult) {
            this.logger.debug(`Direct Redis HIT for key: ${directKey}`)
            const parsedResult = JSON.parse(directResult) as T
            // Store it back in the cache manager for future use
            await this.cacheManager.set(key, parsedResult)
            return parsedResult
          }
        } catch (redisError) {
          this.logger.debug(
            `Direct Redis GET error for ${key}: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }

      return undefined
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Cache GET error for key ${key}: ${errorMessage}`)
      return undefined
    }
  }

  /**
   * Store an item in the cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlValue = ttl || parseInt(process.env.REDIS_TTL || '3600')

    try {
      // Set in cache manager
      await this.cacheManager.set(key, value, ttlValue)
      this.logger.debug(`Cache SET: ${key}, TTL: ${ttlValue}s`)

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
        } catch (redisError) {
          this.logger.debug(
            `Direct Redis SET error for ${key}: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Cache SET error for key ${key}: ${errorMessage}`)
    }
  }

  /**
   * Delete an item from the cache
   */
  public async delete(key: string): Promise<void> {
    try {
      // Delete from cache manager
      await this.cacheManager.del(key)
      this.logger.debug(`Cache DELETE: ${key}`)

      // Also delete from direct Redis if available
      if (this.redisClient) {
        try {
          const directKey = `cache:${key}`
          await this.redisClient.del(directKey)
        } catch (redisError) {
          this.logger.debug(
            `Direct Redis DELETE error for ${key}: ${redisError instanceof Error ? redisError.message : String(redisError)}`,
          )
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.error(`Cache DELETE error for key ${key}: ${errorMessage}`)
    }
  }
}
