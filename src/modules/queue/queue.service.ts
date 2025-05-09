import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import * as os from 'os'
import { QueueException } from './queue.exception'

/**
 * Service for adding landmark processing jobs to the queue
 * Configured to support distributed processing
 */
@Injectable()
export class LandmarksQueueService {
  private readonly logger = new Logger(LandmarksQueueService.name)
  private readonly instanceId: string

  constructor(@InjectQueue('landmarks') private landmarksQueue: Queue) {
    // Generate a robust instance identifier that combines hostname with a UUID
    // This provides both uniqueness and traceability in distributed environments
    const hostname = os.hostname().split('.')[0] // Get hostname without domain
    const uniqueId = uuidv4().substring(0, 8) // Short UUID for uniqueness
    this.instanceId = `${hostname}-${uniqueId}`

    this.logger.log(
      `LandmarksQueueService initialized with instance ID: ${this.instanceId}`,
    )
  }

  /**
   * Adds a job to process landmarks by coordinates to the queue
   */
  public async addLandmarkProcessingJob(
    lat: number,
    lng: number,
    radius: number,
    requestId: string,
  ): Promise<string> {
    this.logger.log(
      `Producer ${this.instanceId} adding job to queue: lat=${lat}, lng=${lng}, radius=${radius}, requestId=${requestId}`,
    )

    try {
      const job = await this.landmarksQueue.add('process-landmarks', {
        lat,
        lng,
        radius,
        requestId,
        producerId: this.instanceId,
        timestamp: new Date().toISOString(),
      })

      this.logger.log(
        `Producer ${this.instanceId} added job with ID: ${job.id}`,
      )
      return job.id as string
    } catch (error) {
      throw new QueueException(
        'SQR002',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }
  }

  /**
   * Gets information about the queue
   */
  public async getQueueInfo() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.landmarksQueue.getWaitingCount(),
      this.landmarksQueue.getActiveCount(),
      this.landmarksQueue.getCompletedCount(),
      this.landmarksQueue.getFailedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      name: this.landmarksQueue.name,
      producerId: this.instanceId,
    }
  }
}
