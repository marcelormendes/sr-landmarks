import { Test, TestingModule } from '@nestjs/testing'
import { WebhookController } from './webhook.controller'
import { WebhookService } from '../services/webhook.service'
import { Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { RESPONSE_MESSAGES, DEFAULT_SEARCH_RADIUS, ERROR_MESSAGES } from '../constants'
import { AuthGuard } from './guard/auth.guard'
import { LandmarksProcessorService } from '../services/landmarks/landmarks-processor.service'
import { WebhookType } from '@prisma/client'
import { ConfigService } from '@nestjs/config'

describe('WebhookController', () => {
  let controller: WebhookController
  let webhookService: WebhookService
  let landmarksProcessorService: LandmarksProcessorService
  let configService: ConfigService
  let loggerSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance

  beforeEach(async () => {
    const mockProcessLandmarks = jest.fn().mockImplementation(() => Promise.resolve())
    
    // Spy on error for assertions but make it silent
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    // Spy on log to make it silent
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            createWebhookRequest: jest.fn().mockImplementation(() => Promise.resolve()),
            processCoordinates: jest.fn().mockImplementation(() => Promise.resolve()),
            getWebhookStatus: jest.fn(),
            getRecentWebhooks: jest.fn(),
            markAsCompleted: jest.fn().mockImplementation(() => Promise.resolve()),
            markAsFailed: jest.fn().mockImplementation(() => Promise.resolve()),
          },
        },
        {
          provide: LandmarksProcessorService,
          useValue: {
            processLandmarksByCoordinates: mockProcessLandmarks,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'api.syncTimeout') return 30000; // 30 seconds default timeout
              return undefined;
            }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<WebhookController>(WebhookController)
    webhookService = module.get<WebhookService>(WebhookService)
    landmarksProcessorService = module.get<LandmarksProcessorService>(LandmarksProcessorService)
    configService = module.get<ConfigService>(ConfigService)

    // Clear all mock calls before each test
    jest.clearAllMocks()
  })

  afterEach(() => {
    loggerSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('webhookRequest (Async)', () => {
    it('should accept coordinates and return webhook response for async request', async () => {
      const dto = { 
        lat: 40.0, 
        lng: -74.0, 
        radius: 500
      }
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-123')

      const result = await controller.webhookRequest(dto)

      expect(webhookService.createWebhookRequest).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius,
        'test-uuid-123',
        WebhookType.Async
      )
      
      expect(webhookService.processCoordinates).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius,
        'test-uuid-123'
      )
      
      expect(result).toEqual({
        success: true,
        message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
        requestId: 'test-uuid-123',
      })
    })

    it('should use default radius for async request when not provided', async () => {
      const dto = { 
        lat: 40.0, 
        lng: -74.0
      }
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-456')

      const result = await controller.webhookRequest(dto)

      expect(webhookService.createWebhookRequest).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        DEFAULT_SEARCH_RADIUS,
        'test-uuid-456',
        WebhookType.Async
      )
      
      expect(result).toEqual({
        success: true,
        message: RESPONSE_MESSAGES.WEBHOOK_RECEIVED,
        requestId: 'test-uuid-456',
      })
    })
  })

  describe('webhookRequestSync', () => {
    it('should process coordinates synchronously and return success response', async () => {
      const dto = {
        lat: 40.0,
        lng: -74.0,
        radius: 500
      }
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-789')

      const result = await controller.webhookRequestSync(dto)

      expect(webhookService.createWebhookRequest).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius,
        'test-uuid-789',
        WebhookType.Sync
      )

      expect(landmarksProcessorService.processLandmarksByCoordinates).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius
      )

      expect(webhookService.markAsCompleted).toHaveBeenCalledWith('test-uuid-789')

      expect(result).toEqual({
        success: true,
        requestId: 'test-uuid-789',
        message: 'Coordinates processed successfully'
      })
    })

    it('should use default radius for sync request when not provided', async () => {
      const dto = {
        lat: 40.0,
        lng: -74.0
      }
      jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-101')

      await controller.webhookRequestSync(dto)

      expect(webhookService.createWebhookRequest).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        DEFAULT_SEARCH_RADIUS,
        'test-uuid-101',
        WebhookType.Sync
      )

      expect(landmarksProcessorService.processLandmarksByCoordinates).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        DEFAULT_SEARCH_RADIUS
      )
    })

    it('should handle errors in sync processing', async () => {
      const dto = {
        lat: 40.0,
        lng: -74.0,
        radius: 500
      }
      const requestId = 'test-uuid-error'
      jest.spyOn(require('uuid'), 'v4').mockReturnValue(requestId)

      // Mock all service calls
      webhookService.createWebhookRequest = jest.fn().mockResolvedValue(undefined)
      webhookService.markAsFailed = jest.fn().mockResolvedValue(undefined)
      landmarksProcessorService.processLandmarksByCoordinates = jest.fn().mockRejectedValue(new Error('Overpass API error'))

      await expect(controller.webhookRequestSync(dto)).rejects.toThrow(InternalServerErrorException)
      expect(webhookService.createWebhookRequest).toHaveBeenCalledWith(
        dto.lat,
        dto.lng,
        dto.radius,
        requestId,
        WebhookType.Sync
      )
      expect(webhookService.markAsFailed).toHaveBeenCalledWith(
        requestId,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      )
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error in synchronous webhook.*: .*Overpass API error/),
        expect.any(String)
      )
    })
  })

  describe('getWebhookStatus', () => {
    it('should return webhook status when found', async () => {
      const requestId = '550e8400-e29b-41d4-a716-446655440000'
      
      const mockWebhookData = {
        requestId,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        error: undefined,
        type: WebhookType.Async
      }
      
      webhookService.getWebhookStatus = jest.fn().mockResolvedValue(mockWebhookData)
      
      const result = await controller.getWebhookStatus(requestId)
      
      expect(webhookService.getWebhookStatus).toHaveBeenCalledWith(requestId)
      expect(result).toEqual({
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
      })
    })
    
    it('should throw NotFoundException when webhook not found', async () => {
      const requestId = '550e8400-e29b-41d4-a716-446655440000'
      webhookService.getWebhookStatus = jest.fn().mockResolvedValue(null)
      await expect(controller.getWebhookStatus(requestId)).rejects.toThrow(NotFoundException)
    })
  })
})
