import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

/**
 * Health check for the landmarks queue
 * Used by monitoring systems to track queue health in distributed setups
 */
@Injectable()
export class QueueHealthIndicator {
  constructor(@InjectQueue('landmarks') private landmarksQueue: Queue) {}

  /**
   * Check the health of the queue
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if queue is connected to Redis
      const client = await this.landmarksQueue.client
      const isClientReady = client && client.status === 'ready'

      if (!isClientReady) {
        return {
          [key]: {
            status: 'down',
            message: 'Queue Redis client is not ready',
          },
        }
      }

      // Get queue metrics
      const [waiting, active, delayed, failed] = await Promise.all([
        this.landmarksQueue.getWaitingCount(),
        this.landmarksQueue.getActiveCount(),
        this.landmarksQueue.getDelayedCount(),
        this.landmarksQueue.getFailedCount(),
      ])

      return {
        [key]: {
          status: 'up',
          metrics: {
            waiting,
            active,
            delayed,
            failed,
          },
        },
      }
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  }
}
