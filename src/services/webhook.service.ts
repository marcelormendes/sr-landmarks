import { Injectable, Logger } from '@nestjs/common'
import { roundCoordinate, encodeGeohash } from '../utils/coordinate.util'
import { WebhookRequestRepository } from '../repositories/webhook-request.repository'
import { LandmarksQueueService } from '../services/landmarks/queue/landmarks-queue.service'

/**
 * Service for handling webhook-related operations.
 * Processes coordinate data received via webhook endpoints.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)

  constructor(
    private readonly webhookRequestRepository: WebhookRequestRepository,
    private readonly landmarksQueueService: LandmarksQueueService,
  ) {}

  /**
   * Processes coordinates by adding a job to the queue
   * Uses geohash for consistent processing
   */
  async processCoordinates(
    lat: number,
    lng: number,
    radius: number,
    requestId: string,
  ): Promise<void> {
    // Round coordinates for consistency
    const roundedLat = roundCoordinate(lat)
    const roundedLng = roundCoordinate(lng)
    const geohash = encodeGeohash(roundedLat, roundedLng)

    this.logger.log(
      `Adding coordinates to processing queue [${requestId}]: lat=${roundedLat}, lng=${roundedLng}, radius=${radius}m, geohash=${geohash}`,
    )

    try {
      // Create webhook request record with 'pending' status
      await this.webhookRequestRepository.createRequest({
        requestId,
        lat,
        lng,
        radius,
      })

      // Add job to the landmarks processing queue
      const jobId = await this.landmarksQueueService.addLandmarkProcessingJob(
        roundedLat,
        roundedLng,
        radius,
        requestId,
      )

      this.logger.log(
        `Job added to queue with ID: ${jobId} for request: ${requestId}`,
      )
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace',
      )

      // Update webhook request with error
      await this.webhookRequestRepository.markAsFailed(
        requestId,
        error instanceof Error ? error.message : 'Unknown error',
      )

      throw error
    }
  }

  /**
   * Retrieve the status of a webhook request
   */
  async getWebhookStatus(requestId: string) {
    return this.webhookRequestRepository.getById(requestId)
  }
}
