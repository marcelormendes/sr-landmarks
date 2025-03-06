import { HttpStatus } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO for incoming webhook requests
 */
export class WebhookRequestDto {
  @ApiProperty({
    description: 'Latitude coordinate (decimal degrees)',
    example: 48.8584,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  lat: number

  @ApiProperty({
    description: 'Longitude coordinate (decimal degrees)',
    example: 2.2945,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  lng: number

  @ApiProperty({
    description: 'Search radius in meters (optional, defaults to 500)',
    example: 1000,
    minimum: 1,
    maximum: 10000,
    required: false,
    type: Number,
  })
  radius?: number
}

/**
 * DTO for webhook response
 */
export class WebhookResponseDto {
  @ApiProperty({
    description: 'Whether the webhook was successfully received',
    example: true,
  })
  success: boolean

  @ApiProperty({
    description: 'Status message',
    example: 'Webhook received and processing initiated',
  })
  message: string

  @ApiProperty({
    description: 'Unique ID for tracking this webhook request',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId: string
}

/**
 * DTO for coordinate information
 */
export class CoordinatesDto {
  @ApiProperty({
    description: 'Latitude coordinate (decimal degrees)',
    example: 48.8584,
    type: Number,
  })
  lat: number

  @ApiProperty({
    description: 'Longitude coordinate (decimal degrees)',
    example: 2.2945,
    type: Number,
  })
  lng: number

  @ApiProperty({
    description: 'Search radius in meters',
    example: 500,
    type: Number,
  })
  radius: number
}

/**
 * DTO for webhook status response
 */
export class WebhookStatusDto {
  @ApiProperty({
    description: 'Unique ID for this webhook request',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId: string

  @ApiProperty({
    description: 'Processing status (pending, completed, failed)',
    example: 'completed',
    enum: ['pending', 'completed', 'failed'],
  })
  status: string

  @ApiProperty({
    description: 'When the webhook request was received',
    example: '2025-03-04T15:22:31.789Z',
  })
  createdAt: Date

  @ApiProperty({
    description: 'When processing was completed (undefined if pending)',
    example: '2025-03-04T15:22:35.123Z',
    required: false,
  })
  completedAt: Date | undefined

  @ApiProperty({
    description: 'Coordinates used for this webhook request',
    type: CoordinatesDto,
  })
  coordinates: CoordinatesDto

  @ApiProperty({
    description: 'Error message if processing failed (undefined otherwise)',
    example: 'Overpass API timeout',
    required: false,
  })
  error: string | undefined
}

/**
 * DTO for webhook summary (used in listing)
 */
export class WebhookSummaryDto {
  @ApiProperty({
    description: 'Unique ID for this webhook request',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId: string

  @ApiProperty({
    description: 'Processing status (pending, completed, failed)',
    example: 'completed',
    enum: ['pending', 'completed', 'failed'],
  })
  status: string

  @ApiProperty({
    description: 'When the webhook request was received',
    example: '2025-03-04T15:22:31.789Z',
  })
  createdAt: Date

  @ApiProperty({
    description: 'Coordinates used for this webhook request',
    type: CoordinatesDto,
  })
  coordinates: CoordinatesDto
}

/**
 * API documentation for the Webhook endpoints
 */
export const WebhookApiDocs = {
  OPERATIONS: {
    POST_WEBHOOK: {
      summary: 'Process coordinates via webhook',
      description:
        'Submit coordinates for async processing and get a requestId for tracking',
    },
    GET_STATUS: {
      summary: 'Get webhook request status',
      description: 'Check the status of a previously submitted webhook request',
    },
    GET_RECENT: {
      summary: 'Get recent webhook requests',
      description: 'List recently submitted webhook requests and their status',
    },
  },

  PARAMS: {
    REQUEST_ID: {
      name: 'requestId',
      description: 'UUID of the webhook request',
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
  },

  RESPONSES: {
    ACCEPTED: {
      status: HttpStatus.ACCEPTED,
      description: 'Webhook payload accepted for processing',
      type: WebhookResponseDto,
    },
    STATUS_OK: {
      status: HttpStatus.OK,
      description: 'Webhook request details',
      type: WebhookStatusDto,
    },
    RECENT_OK: {
      status: HttpStatus.OK,
      description: 'Recent webhook requests',
      type: WebhookSummaryDto,
      isArray: true,
    },
    NOT_FOUND: {
      status: HttpStatus.NOT_FOUND,
      description: 'Webhook request not found',
    },
    BAD_REQUEST: {
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid request format or parameters',
    },
  },
}
