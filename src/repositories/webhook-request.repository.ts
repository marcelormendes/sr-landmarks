import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'
import { WebhookStatus } from '@prisma/client'

@Injectable()
export class WebhookRequestRepository {
  private readonly logger = new Logger(WebhookRequestRepository.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new webhook request record
   */
  public async createRequest(data: {
    requestId: string
    lat: number
    lng: number
    radius: number
  }) {
    this.logger.debug(`Creating webhook request record: ${data.requestId}`)

    return this.prisma.webhookRequest.create({
      data: {
        requestId: data.requestId,
        lat: data.lat,
        lng: data.lng,
        radius: data.radius,
        status: WebhookStatus.Pending,
      },
    })
  }

  /**
   * Update a webhook request record when processing is complete
   */
  public async markAsCompleted(requestId: string) {
    this.logger.debug(`Marking webhook request as completed: ${requestId}`)

    return this.prisma.webhookRequest.update({
      where: { requestId },
      data: {
        status: WebhookStatus.Completed,
        completedAt: new Date(),
      },
    })
  }

  /**
   * Update a webhook request record when processing fails
   */
  public async markAsFailed(requestId: string, error: string) {
    this.logger.debug(`Marking webhook request as failed: ${requestId}`)

    return this.prisma.webhookRequest.update({
      where: { requestId },
      data: {
        status: WebhookStatus.Failed,
        completedAt: new Date(),
        error,
      },
    })
  }

  /**
   * Get webhook request by its ID
   */
  public async getById(requestId: string) {
    return this.prisma.webhookRequest.findUnique({
      where: { requestId },
    })
  }
}
