import { Controller, Get, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Public } from '../../decorators/public.decorator'
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus'
import { RedisHealthIndicator } from './redis.health'
import { QueueHealthIndicator } from './queue.health'
import { PrismaService } from '../../services/prisma.service'

/**
 * Controller providing health check endpoints for monitoring
 * Used by infrastructure monitoring tools to verify service status
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

  constructor(
    private health: HealthCheckService,
    private redis: RedisHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    private queueHealth: QueueHealthIndicator,
  ) {}

  /**
   * Comprehensive health check endpoint that validates:
   * - Redis connection
   * - Database connection
   * - Queue health
   * - Disk space
   * - Memory usage
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check system health status' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  async check(): Promise<HealthCheckResult> {
    this.logger.log('Running health check')

    return this.health.check([
      // Check Redis connection
      () => this.redis.checkHealth('redis'),

      // Check database connection
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`
          return { prisma: { status: 'up' } }
        } catch (error: unknown) {
          const err = error as Error
          this.logger.error(`Database health check failed: ${err.message}`)
          return { prisma: { status: 'down', message: err.message } }
        }
      },

      // Check queue health
      () => this.queueHealth.isHealthy('landmarksQueue'),

      // Check disk space (at least 250MB free)
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),

      // Check memory (heap usage under 250MB)
      () => this.memory.checkHeap('memory', 250 * 1024 * 1024),
    ])
  }

  /**
   * Dedicated queue health check for monitoring distributed workers
   */
  @Get('queue')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check queue health status' })
  async checkQueue(): Promise<HealthCheckResult> {
    this.logger.log('Running queue health check')
    return this.health.check([
      () => this.queueHealth.isHealthy('landmarksQueue'),
    ])
  }

  /**
   * Detailed Redis inspection endpoint for debugging
   */
  @Get('redis-debug')
  @Public()
  @ApiOperation({ summary: 'Debug Redis cache status' })
  async debugRedis() {
    this.logger.log('Running Redis debug inspection')

    try {
      // Force a cache test
      const connectionWorking = await this.redis.testRedisConnection()

      // Get all Redis keys with our cache prefix
      const cacheKeys = await this.redis.getRedisKeys('cache:*')

      // Get all Redis keys (for debugging)
      const allKeys = await this.redis.getRedisKeys('*')

      return {
        status: connectionWorking ? 'ok' : 'error',
        connection: connectionWorking ? 'connected' : 'disconnected',
        cacheKeys: cacheKeys.keys,
        cacheKeyCount: cacheKeys.count,
        allKeys: allKeys.keys,
        allKeyCount: allKeys.count,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error(
        `Redis debug check failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }
}
