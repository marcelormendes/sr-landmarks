import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'
import { WebhookStatus, WebhookType } from '@prisma/client'

interface CreateWebhookRequestData {
  requestId: string
  lat: number
  lng: number
  radius: number
  webhookType: WebhookType
}

@Injectable()
export class WebhookRequestRepository {
  private readonly logger = new Logger(WebhookRequestRepository.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new webhook request record
   */
  public async createRequest({
    requestId,
    lat,
    lng,
    radius,
    webhookType,
  }: CreateWebhookRequestData) {
    this.logger.debug(`Creating webhook request record: ${requestId}`)

    return this.prisma.webhookRequest.create({
      data: {
        requestId,
        lat,
        lng,
        radius,
        type: webhookType,
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

  async getRecentRequests(limit = 10) {
    return this.prisma.webhookRequest.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }
}
