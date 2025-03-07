import { Injectable, Logger } from '@nestjs/common'
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { LandmarksProcessorService } from '../landmarks-processor.service'
import { WebhookRequestRepository } from '../../../repositories/webhook-request.repository'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { LANDMARKS_QUEUE } from '../../../constants/queue.constants'
import { LandmarkProcessingJob } from '../../../interfaces/job.interface'

/**
 * Consumes jobs from the landmarks queue and processes them
 */
@Processor(LANDMARKS_QUEUE)
@Injectable()
export class LandmarksQueueConsumer extends WorkerHost {
  private readonly logger = new Logger(LandmarksQueueConsumer.name)
  private readonly workerId: string

  constructor(
    private readonly landmarksProcessorService: LandmarksProcessorService,
    private readonly webhookRequestRepository: WebhookRequestRepository,
  ) {
    super()

    // Generate a robust worker identifier that combines hostname with a UUID
    // This provides both uniqueness and traceability in distributed environments
    const hostname = os.hostname().split('.')[0] // Get hostname without domain
    const uniqueId = uuidv4().substring(0, 8) // Short UUID for uniqueness
    this.workerId = `${hostname}-${uniqueId}`

    // Log worker info on startup
    this.logger.log(`Worker started with ID: ${this.workerId}`)
  }

  /**
   * Process jobs from the queue
   * This method is called by the worker when there's a job to process
   */
  public async process(
    job: Job<LandmarkProcessingJob, any, string>,
  ): Promise<any> {
    const { lat, lng, radius, requestId, producerId, timestamp } = job.data

    this.logger.log(
      `Worker ${this.workerId} processing job ${job.id}: lat=${lat}, lng=${lng}, radius=${radius}, requestId=${requestId}` +
        (producerId ? `, from producer: ${producerId}` : '') +
        (timestamp ? `, submitted at: ${timestamp}` : ''),
    )

    try {
      await job.updateProgress(10)

      // Process landmarks
      const landmarks =
        await this.landmarksProcessorService.processLandmarksByCoordinates(
          lat,
          lng,
          radius,
        )

      await job.updateProgress(80)

      // Update webhook request status to completed
      await this.webhookRequestRepository.markAsCompleted(requestId)

      await job.updateProgress(100)

      this.logger.log(
        `Worker ${this.workerId} completed job ${job.id} successfully`,
      )
      return {
        success: true,
        landmarksCount: landmarks.length,
        workerInfo: {
          id: this.workerId,
          hostname: os.hostname(),
          processingTime: `${Date.now() - (timestamp ? new Date(timestamp).getTime() : Date.now())}ms`,
        },
      }
    } catch (error) {
      this.logger.error(
        `Worker ${this.workerId} error processing job ${job.id}: ${(error as Error).message}`,
        (error as Error).stack,
      )

      // Update webhook request status to failed
      await this.webhookRequestRepository.markAsFailed(
        requestId,
        (error as Error).message,
      )

      // Rethrow the error to let BullMQ handle retries
      throw error
    }
  }

  /**
   * Handle worker errors
   */
  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`Worker ${this.workerId} encountered an error`, err.stack)
  }

  /**
   * Log when the worker is ready
   */
  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log(`Worker ${this.workerId} ready and listening for jobs`)
  }
}
