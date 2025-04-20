import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  UseGuards,
  Logger,
  Version,
  HttpStatus,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { WebhookService } from '@modules/webhook/webhook.service'
import { LandmarksProcessorService } from '@modules/landmarks/services/landmarks-processor.service'
import { WebhookSchema, UuidSchema } from '@modules/webhook/webhook.schema'
import { EnhancedZodValidationPipe } from '@common/pipes/zod-validation.pipe'
import { AuthGuard } from '@common/guards/auth.guard'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger'
import {
  WebhookRequestDto,
  WebhookResponseDto,
  WebhookStatusDto,
  WebhookApiDocs,
} from '@modules/webhook/webhook.dto'
import {
  ERROR_MESSAGES,
  DEFAULT_SEARCH_RADIUS,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
} from '@shared/constants'
import { WebhookType } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { WebhookException } from './webhook.exception'

/**
 * Controller for handling webhook endpoints.
 * Processes coordinate data and returns landmark information.
 * Only POST endpoint requires authentication, GET endpoints are public.
 */
@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private webhookService: WebhookService,
    private landmarksProcessorService: LandmarksProcessorService,
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  /**
   * Receives geographic coordinates via webhook and acknowledges receipt
   * Processing happens asynchronously in the background
   */
  @Post()
  @UseGuards(AuthGuard)
  @Version('1')
  @HttpCode(202)
  @ApiBearerAuth()
  @ApiOperation(WebhookApiDocs.OPERATIONS.POST_WEBHOOK)
  @ApiBody({ type: WebhookRequestDto })
  @ApiResponse(WebhookApiDocs.RESPONSES.ACCEPTED)
  async webhookRequest(
    @Body(
      new EnhancedZodValidationPipe(
        WebhookSchema,
        new Logger('WebhookValidation'),
      ),
    )
    coordinates: WebhookRequestDto,
  ): Promise<WebhookResponseDto> {
    const { lat, lng, radius = DEFAULT_SEARCH_RADIUS } = coordinates
    const requestId = uuidv4()

    try {
      // First create the webhook request record and wait for it
      await this.webhookService.createWebhookRequest(
        lat,
        lng,
        radius,
        requestId,
        WebhookType.Async,
      )

      // Then start background processing
      void this.webhookService.processCoordinates(lat, lng, radius, requestId)

      return {
        success: true,
        requestId,
        message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
      }
    } catch (error) {
      throw new WebhookException('SRW001', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Retrieve the status of a webhook request
   */
  @Get(`:${'uuid'}`)
  @Version('1')
  @ApiOperation(WebhookApiDocs.OPERATIONS.GET_STATUS)
  @ApiParam(WebhookApiDocs.PARAMS.REQUEST_ID)
  @ApiResponse(WebhookApiDocs.RESPONSES.STATUS_OK)
  @ApiResponse(WebhookApiDocs.RESPONSES.NOT_FOUND)
  async getWebhookStatus(
    @Param(
      'uuid',
      new EnhancedZodValidationPipe(
        UuidSchema,
        new Logger('WebhookValidation'),
      ),
    )
    requestId: string,
  ): Promise<WebhookStatusDto> {
    try {
      const webhookRequest =
        await this.webhookService.getWebhookStatus(requestId)

      if (!webhookRequest) {
        throw new WebhookException('SRW002', HttpStatus.NOT_FOUND)
      }

      return {
        requestId: webhookRequest.requestId,
        status: webhookRequest.status,
        createdAt: webhookRequest.createdAt,
        completedAt: webhookRequest.completedAt || undefined,
        coordinates: {
          lat: webhookRequest.lat,
          lng: webhookRequest.lng,
          radius: webhookRequest.radius,
        },
        error: webhookRequest.error || undefined,
      }
    } catch (error: unknown) {
      throw new WebhookException('SRW001', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
  /**
   * Synchronous webhook endpoint that processes coordinates fully before responding
   */
  @Post('/sync')
  @UseGuards(AuthGuard)
  @Version('1')
  @HttpCode(HTTP_STATUS.OK) // 200 on success, others based on outcome
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Synchronously process coordinates and return results or errors',
  })
  @ApiBody({ type: WebhookRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Coordinates processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Overpass API or processing failed',
  })
  @ApiResponse({
    status: 408,
    description: 'Request timeout',
  })
  async webhookRequestSync(
    @Body(
      new EnhancedZodValidationPipe(
        WebhookSchema,
        new Logger('WebhookValidation'),
      ),
    )
    coordinates: WebhookRequestDto,
  ): Promise<WebhookResponseDto> {
    const { lat, lng, radius = DEFAULT_SEARCH_RADIUS } = coordinates
    const requestId = uuidv4()
    this.logger.log(
      `Synchronously processing webhook request ${requestId} for coordinates: (${coordinates.lat}, ${coordinates.lng})`,
    )

    // Create an AbortController with the configured timeout
    const controller = new AbortController()
    const timeout = this.configService.get<number>('api.syncTimeout')
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // First create the webhook request record
      await this.webhookService.createWebhookRequest(
        lat,
        lng,
        radius,
        requestId,
        WebhookType.Sync,
      )

      // Then process coordinates fully within the request-response cycle
      await Promise.race([
        this.landmarksProcessorService.processLandmarksByCoordinates(
          lat,
          lng,
          radius,
        ),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timeout'))
          })
        }),
      ])

      // Mark the request as completed since we processed it synchronously
      await this.webhookService.markAsCompleted(requestId)

      // If successful, return a success response
      return {
        success: true,
        requestId,
        message: 'Coordinates processed successfully',
      }
    } catch (error) {
      await this.webhookService.markAsFailed(
        requestId,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      )
      throw new WebhookException(
        'SRW001',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
