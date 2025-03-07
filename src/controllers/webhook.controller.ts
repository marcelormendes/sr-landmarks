import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Version,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { WebhookService } from '../services/webhook.service'
import { WebhookSchema, UuidSchema } from '../schemas/webhook.schema'
import { EnhancedZodValidationPipe } from '../schemas/pipes/zod-validation.pipe'
import { AuthGuard } from './guard/auth.guard'
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
} from '../dto/webhook.dto'
import {
  ERROR_MESSAGES,
  DEFAULT_SEARCH_RADIUS,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
} from '../constants'
import { LandmarksProcessorService } from '../services/landmarks/landmarks-processor.service'
import { WebhookType } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
/**
 * Controller for handling webhook endpoints.
 * Processes coordinate data and returns landmark information.
 * Only POST endpoint requires authentication, GET endpoints are public.
 */
@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)
  constructor(
    private webhookService: WebhookService,
    private landmarksProcessorService: LandmarksProcessorService,
    private configService: ConfigService,
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
    @Body(new EnhancedZodValidationPipe(WebhookSchema))
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
      this.logger.error(
        `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace',
      )
      throw new InternalServerErrorException('Error processing webhook')
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
    @Param('uuid', new EnhancedZodValidationPipe(UuidSchema)) requestId: string,
  ): Promise<WebhookStatusDto> {
    try {
      const webhookRequest =
        await this.webhookService.getWebhookStatus(requestId)

      if (!webhookRequest) {
        throw new NotFoundException(ERROR_MESSAGES.WEBHOOK_REQUEST_NOT_FOUND)
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
    } catch (error) {
      // Rethrow NotFoundException and BadRequestException
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error
      }
      // For any other errors, log and wrap in a generic error
      this.logger.error(
        `Error getting webhook status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw new InternalServerErrorException({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      })
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
    @Body(new EnhancedZodValidationPipe(WebhookSchema))
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
      // Log the full error for debugging
      this.logger.error(
        `Error in synchronous webhook ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      )

      // Mark the request as failed with a generic error message
      await this.webhookService.markAsFailed(
        requestId,
        error instanceof Error && error.message === 'Request timeout'
          ? 'Request timeout exceeded'
          : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      )

      // Return a clean error response
      if (error instanceof Error && error.message === 'Request timeout') {
        throw new InternalServerErrorException({
          success: false,
          requestId,
          message: 'Request timeout exceeded',
        })
      }

      throw new InternalServerErrorException({
        success: false,
        requestId,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
