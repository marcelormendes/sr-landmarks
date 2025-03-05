import { Test, TestingModule } from '@nestjs/testing'
import { WebhookController } from './webhook.controller'
import { WebhookService } from '../services/webhook.service'
import { Coordinates } from '../schemas/coordinate-validation.schema'
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { RESPONSE_MESSAGES, DEFAULT_SEARCH_RADIUS } from '../constants'

// Create a mock logger that doesn't log during tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
}
import { AuthGuard } from './guard/auth.guard'

describe('WebhookController', () => {
  let controller: WebhookController
  let service: WebhookService

  const mockLandmarks = [
    {
      name: 'Test Landmark',
      type: 'attraction',
      distance: 100,
      center: { lat: 40.1, lng: -74.5 },
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            processCoordinates: jest.fn().mockImplementation(() => Promise.resolve()),
            getWebhookStatus: jest.fn(),
            getRecentWebhooks: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<WebhookController>(WebhookController)
    service = module.get<WebhookService>(WebhookService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('processCoordinates', () => {
    it('should accept coordinates with provided radius and return webhook response', async () => {
      const dto: Coordinates = { lat: 40.0, lng: -74.0, radius: 500 }
      
      // Mock the UUID generator for consistent testing
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-123')

      const result = await controller.processCoordinates(dto)

      // Service should be called with the correct params, including requestId
      expect(service.processCoordinates).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius,
        'test-uuid-123'
      )
      
      // Verify processCoordinates was called but not awaited
      expect(service.processCoordinates).toHaveBeenCalled()
      
      // Response should be a webhook acknowledgment, not landmarks
      expect(result).toEqual({
        success: true,
        message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
        requestId: 'test-uuid-123',
      })
    })

    it('should use default radius when not provided', async () => {
      const dto: Coordinates = { lat: 40.0, lng: -74.0 }
      
      // Mock the UUID generator for consistent testing
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-456')

      const result = await controller.processCoordinates(dto)

      // Service should be called with default radius
      expect(service.processCoordinates).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        DEFAULT_SEARCH_RADIUS,
        'test-uuid-456'
      )
      
      // Verify processCoordinates was called but not awaited
      expect(service.processCoordinates).toHaveBeenCalled()
      
      // Response should be a webhook acknowledgment
      expect(result).toEqual({
        success: true,
        message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
        requestId: 'test-uuid-456',
      })
    })
  })
  
  describe('getWebhookStatus', () => {
    it('should return webhook status when found', async () => {
      const requestId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Create a realistic webhook request data structure as returned by repository
      const mockWebhookData = {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        error: null,
      }
      
      // Expected response transformed by controller
      const expectedResponse = {
        requestId: mockWebhookData.requestId,
        status: mockWebhookData.status,
        createdAt: mockWebhookData.createdAt,
        completedAt: mockWebhookData.completedAt,
        coordinates: {
          lat: mockWebhookData.lat,
          lng: mockWebhookData.lng,
          radius: mockWebhookData.radius,
        },
        error: mockWebhookData.error,
      }
      
      service.getWebhookStatus = jest.fn().mockResolvedValue(mockWebhookData)
      
      const result = await controller.getWebhookStatus(requestId)
      
      expect(service.getWebhookStatus).toHaveBeenCalledWith(requestId)
      expect(result).toEqual(expectedResponse)
    })
    
    it('should throw NotFoundException when webhook not found', async () => {
      const requestId = '550e8400-e29b-41d4-a716-446655440000'
      
      service.getWebhookStatus = jest.fn().mockResolvedValue(null)
      
      await expect(controller.getWebhookStatus(requestId)).rejects.toThrow(NotFoundException)
    })
    
    it('should throw BadRequestException for invalid UUID format', async () => {
      const invalidUuid = 'not-a-valid-uuid'
      
      await expect(controller.getWebhookStatus(invalidUuid)).rejects.toThrow(BadRequestException)
    })
  })
})
