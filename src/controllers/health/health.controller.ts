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

    try {
      return this.health.check([
        // Check Redis connection
        () => this.redis.checkHealth('redis'),

        // Check database connection
        async () => {
          try {
            await this.prisma.$queryRaw`SELECT 1`
            return { prisma: { status: 'up' } }
          } catch (error: unknown) {
            if (error instanceof Error) {
              this.logger.error(
                `Database health check failed: ${error.message}`,
              )
              return { prisma: { status: 'down', message: error.message } }
            }
            this.logger.error(
              'Unknown error occurred during database health check',
            )
            return { prisma: { status: 'down', message: 'Unknown error' } }
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Health check failed: ${error.message}`)
        throw new Error(`Health check failed: ${error.message}`)
      }
      this.logger.error('Unknown error occurred during health check')
      throw new Error('Health check failed: Unknown error')
    }
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
}
