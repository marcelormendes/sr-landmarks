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
} from '../constants'
import { ZodError } from 'zod'

/**
 * Controller for handling webhook endpoints.
 * Processes coordinate data and returns landmark information.
 * Only POST endpoint requires authentication, GET endpoints are public.
 */
@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)
  constructor(private webhookService: WebhookService) {}

  /**
   * Receives geographic coordinates via webhook and acknowledges receipt
   * Processing happens asynchronously in the background
   */
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(202)
  @ApiBearerAuth()
  @ApiOperation(WebhookApiDocs.OPERATIONS.POST_WEBHOOK)
  @ApiBody({ type: WebhookRequestDto })
  @ApiResponse(WebhookApiDocs.RESPONSES.ACCEPTED)
  async processCoordinates(
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
      throw new BadRequestException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR)
    }
  }
}
