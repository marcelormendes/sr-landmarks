import { Injectable, Logger } from '@nestjs/common'
import { roundCoordinate, encodeGeohash } from '@common/utils/coordinate.util'
import { WebhookRequestRepository } from '@modules/webhook/webhook-request.repository'
import { LandmarksQueueService } from '@modules/queue/landmarks-queue.service'
import { WebhookType } from '@prisma/client'
import { WebhookServiceException } from '@common/exceptions/api.exceptions'
import { ErrorHandler } from '@common/exceptions/error-handling'

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
   * Creates a new webhook request record in the database
   */
  public async createWebhookRequest(
    lat: number,
    lng: number,
    radius: number,
    requestId: string,
    webhookType: WebhookType,
  ): Promise<void> {
    await this.webhookRequestRepository.createRequest({
      requestId,
      lat,
      lng,
      radius,
      webhookType,
    })
  }

  /**
   * Processes coordinates by adding a job to the queue
   * Uses geohash for consistent processing
   */
  public async processCoordinates(
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
      // Update webhook request with error
      await this.webhookRequestRepository.markAsFailed(
        requestId,
        error instanceof Error ? error.message : 'Unknown error',
      )

      ErrorHandler.handle(error, WebhookServiceException, {
        context: 'Webhook service',
        logger: this.logger,
      })
    }
  }

  /**
   * Retrieve the status of a webhook request
   */
  async getWebhookStatus(requestId: string) {
    return this.webhookRequestRepository.getById(requestId)
  }

  /**
   * Mark a webhook request as completed
   */
  async markAsCompleted(requestId: string) {
    return this.webhookRequestRepository.markAsCompleted(requestId)
  }

  /**
   * Mark a webhook request as failed with an error message
   */
  async markAsFailed(requestId: string, error: string) {
    return this.webhookRequestRepository.markAsFailed(requestId, error)
  }
}
