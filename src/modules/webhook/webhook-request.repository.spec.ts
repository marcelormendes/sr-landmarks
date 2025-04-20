import { Test, TestingModule } from '@nestjs/testing'
import { WebhookRequestRepository } from '@modules/webhook/webhook-request.repository'
import { PrismaService } from '@common/prisma/prisma.service'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { WebhookStatus, WebhookType } from '@prisma/client'

describe('WebhookRequestRepository', () => {
  let repository: WebhookRequestRepository
  let prismaService: PrismaService

  // Mock data with proper types for Prisma
  const mockWebhookRequest = {
    id: 1,
    requestId: 'test-id',
    lat: 0,
    lng: 0,
    radius: 100,
    status: WebhookStatus.Pending,
    createdAt: new Date(),
    completedAt: null,
    error: null,
    type: WebhookType.Async,
  }

  const mockCompletedWebhookRequest = {
    ...mockWebhookRequest,
    status: WebhookStatus.Completed,
    completedAt: new Date(),
    error: null,
  }

  const mockFailedWebhookRequest = {
    ...mockWebhookRequest,
    status: WebhookStatus.Failed,
    completedAt: new Date(),
    error: 'An error occurred',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookRequestRepository,
        {
          provide: PrismaService,
          useValue: {
            webhookRequest: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    repository = module.get<WebhookRequestRepository>(WebhookRequestRepository)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(repository).toBeDefined()
  })

  describe('createRequest', () => {
    it('should create a webhook request', async () => {
      const mockWebhookRequest = {
        id: 1,
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        status: WebhookStatus.Pending,
        createdAt: new Date(),
        completedAt: null,
        error: null,
        type: WebhookType.Async,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'create')
        .mockResolvedValue(mockWebhookRequest)

      const data = {
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        webhookType: WebhookType.Async,
      }

      const result = await repository.createRequest(data)

      expect(prismaService.webhookRequest.create).toHaveBeenCalledWith({
        data: {
          requestId: data.requestId,
          lat: data.lat,
          lng: data.lng,
          radius: data.radius,
          status: WebhookStatus.Pending,
          type: data.webhookType,
        },
      })

      expect(result).toEqual(mockWebhookRequest)
    })

    it('should handle errors when creating request', async () => {
      const data = {
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        webhookType: WebhookType.Async,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'create')
        .mockRejectedValue(new Error('Database error'))

      await expect(repository.createRequest(data)).rejects.toThrow(
        'Database error',
      )
    })
  })

  describe('markAsCompleted', () => {
    it('should mark a webhook request as completed', async () => {
      const mockCompletedWebhookRequest = {
        status: WebhookStatus.Completed,
        completedAt: new Date(),
        error: null,
        id: 1,
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        createdAt: new Date(),
        type: WebhookType.Async,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockResolvedValue(mockCompletedWebhookRequest)

      const result = await repository.markAsCompleted('test-uuid')

      expect(prismaService.webhookRequest.update).toHaveBeenCalledWith({
        where: { requestId: 'test-uuid' },
        data: {
          status: WebhookStatus.Completed,
          completedAt: expect.any(Date),
        },
      })

      expect(result).toEqual(mockCompletedWebhookRequest)
    })

    it('should handle errors when marking as completed (record not found)', async () => {
      const requestId = 'non-existent-id'

      // Mock a Prisma client error for record not found
      const prismaError = new PrismaClientKnownRequestError(
        'Record to update not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      )

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockRejectedValue(prismaError)

      await expect(
        repository.markAsCompleted(requestId),
      ).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })

  describe('markAsFailed', () => {
    it('should mark a webhook request as failed with error message', async () => {
      const mockFailedWebhookRequest = {
        status: WebhookStatus.Failed,
        completedAt: new Date(),
        error: 'Test error message',
        id: 1,
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        createdAt: new Date(),
        type: WebhookType.Async,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockResolvedValue(mockFailedWebhookRequest)

      const result = await repository.markAsFailed(
        'test-uuid',
        'Test error message',
      )

      expect(prismaService.webhookRequest.update).toHaveBeenCalledWith({
        where: { requestId: 'test-uuid' },
        data: {
          status: WebhookStatus.Failed,
          completedAt: expect.any(Date),
          error: 'Test error message',
        },
      })

      expect(result).toEqual(mockFailedWebhookRequest)
    })

    it('should handle errors when marking as failed (database error)', async () => {
      const requestId = 'test-request-id'
      const error = 'An error occurred'

      // Mock a general database error
      const dbError = new Error('Database connection error')

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockRejectedValue(dbError)

      await expect(repository.markAsFailed(requestId, error)).rejects.toThrow(
        'Database connection error',
      )
    })
  })

  describe('getById', () => {
    it('should find a webhook request by ID', async () => {
      const mockWebhookRequest = {
        id: 1,
        requestId: 'test-uuid',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
        status: WebhookStatus.Pending,
        createdAt: new Date(),
        completedAt: null,
        error: null,
        type: WebhookType.Async,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'findUnique')
        .mockResolvedValue(mockWebhookRequest)

      const result = await repository.getById('test-uuid')

      expect(prismaService.webhookRequest.findUnique).toHaveBeenCalledWith({
        where: { requestId: 'test-uuid' },
      })

      expect(result).toEqual(mockWebhookRequest)
    })

    it('should return null when request not found', async () => {
      jest
        .spyOn(prismaService.webhookRequest, 'findUnique')
        .mockResolvedValue(null)

      const result = await repository.getById('non-existent-uuid')

      expect(result).toBeNull()
    })
  })

  describe('getRecentRequests', () => {
    it('should return recent webhook requests with default limit', async () => {
      const mockRequests = [
        {
          id: 1,
          requestId: 'test-uuid-1',
          lat: 40.0,
          lng: -74.0,
          radius: 500,
          status: WebhookStatus.Completed,
          createdAt: new Date(),
          completedAt: new Date(),
          error: null,
          type: WebhookType.Async,
        },
        {
          id: 2,
          requestId: 'test-uuid-2',
          lat: 41.0,
          lng: -75.0,
          radius: 1000,
          status: WebhookStatus.Pending,
          createdAt: new Date(),
          completedAt: null,
          error: null,
          type: WebhookType.Sync,
        },
      ]

      jest
        .spyOn(prismaService.webhookRequest, 'findMany')
        .mockResolvedValue(mockRequests)

      const result = await repository.getRecentRequests()

      expect(prismaService.webhookRequest.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      expect(result).toEqual(mockRequests)
    })

    it('should respect custom limit parameter', async () => {
      await repository.getRecentRequests(5)

      expect(prismaService.webhookRequest.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})