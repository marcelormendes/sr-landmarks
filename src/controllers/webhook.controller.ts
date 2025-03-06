import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger'
import { AuthGuard } from './guard/auth.guard'
import { WebhookService } from '../services/webhook.service'
import { EnhancedZodValidationPipe } from '../schemas/pipes/zod-validation.pipe'
import { WebhookSchema, Webhook } from '../schemas/webhook.schema'
import {
  WebhookApiDocs,
  WebhookRequestDto,
  WebhookResponseDto,
  WebhookStatusDto,
} from '../dto/webhook.dto'
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  DEFAULT_SEARCH_RADIUS,
} from '../constants'
import { UuidSchema } from '../schemas/webhook.schema'

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
  @HttpCode(HTTP_STATUS.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation(WebhookApiDocs.OPERATIONS.POST_WEBHOOK)
  @ApiBody({ type: WebhookRequestDto })
  @ApiResponse(WebhookApiDocs.RESPONSES.ACCEPTED)
  processCoordinates(
    @Body(new EnhancedZodValidationPipe(WebhookSchema)) coordinates: Webhook,
  ): WebhookResponseDto {
    // Generate a UUID for the request ID
    const requestId = uuidv4()

    this.logger.log(
      `Processing webhook request ${requestId} for coordinates: (${coordinates.lat}, ${coordinates.lng})`,
    )

    // Start processing in the background and immediately return
    void this.webhookService
      .processCoordinates(
        coordinates.lat,
        coordinates.lng,
        coordinates.radius || DEFAULT_SEARCH_RADIUS,
        requestId,
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Error processing webhook ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        )
      })

    // Return immediately with a 202 Accepted response
    return {
      success: true,
      requestId,
      message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
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
