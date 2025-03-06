import { Test, TestingModule } from '@nestjs/testing'
import { WebhookRequestRepository } from './webhook-request.repository'
import { PrismaService } from '../services/prisma.service'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

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
    status: 'PENDING',
    createdAt: new Date(),
    completedAt: null,
    error: null,
  }

  const mockCompletedWebhookRequest = {
    ...mockWebhookRequest,
    status: 'COMPLETED',
    completedAt: new Date(),
    error: null,
  }

  const mockFailedWebhookRequest = {
    ...mockWebhookRequest,
    status: 'failed',
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
              update: jest.fn(),
              findUnique: jest.fn(),
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
    it('should create a webhook request record', async () => {
      const data = {
        requestId: 'test-request-id',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
      }

      jest
        .spyOn(prismaService.webhookRequest, 'create')
        .mockResolvedValue(mockWebhookRequest)

      const result = await repository.createRequest(data)

      expect(prismaService.webhookRequest.create).toHaveBeenCalledWith({
        data: {
          requestId: data.requestId,
          lat: data.lat,
          lng: data.lng,
          radius: data.radius,
          status: 'pending',
        },
      })
      expect(result).toEqual(mockWebhookRequest)
    })

    it('should handle database errors during creation', async () => {
      const data = {
        requestId: 'test-request-id',
        lat: 40.0,
        lng: -74.0,
        radius: 500,
      }

      // Mock a Prisma client error (e.g., unique constraint violation)
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      )

      jest
        .spyOn(prismaService.webhookRequest, 'create')
        .mockRejectedValue(prismaError)

      await expect(repository.createRequest(data)).rejects.toThrow(
        PrismaClientKnownRequestError,
      )
    })
  })

  describe('markAsCompleted', () => {
    it('should mark a webhook request as completed', async () => {
      const requestId = 'test-request-id'

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockResolvedValue(mockCompletedWebhookRequest)

      const result = await repository.markAsCompleted(requestId)

      expect(prismaService.webhookRequest.update).toHaveBeenCalledWith({
        where: { requestId },
        data: {
          status: 'completed',
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
    it('should mark a webhook request as failed', async () => {
      const requestId = 'test-request-id'
      const error = 'An error occurred'

      jest
        .spyOn(prismaService.webhookRequest, 'update')
        .mockResolvedValue(mockFailedWebhookRequest)

      const result = await repository.markAsFailed(requestId, error)

      expect(prismaService.webhookRequest.update).toHaveBeenCalledWith({
        where: { requestId },
        data: {
          status: 'failed',
          completedAt: expect.any(Date),
          error,
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
    it('should get a webhook request by ID', async () => {
      const requestId = 'test-request-id'
      
      jest
        .spyOn(prismaService.webhookRequest, 'findUnique')
        .mockResolvedValue(mockWebhookRequest)

      const result = await repository.getById(requestId)

      expect(prismaService.webhookRequest.findUnique).toHaveBeenCalledWith({
        where: { requestId },
      })
      expect(result).toEqual(mockWebhookRequest)
    })

    it('should return null when no webhook request is found', async () => {
      const requestId = 'non-existent-id'

      jest
        .spyOn(prismaService.webhookRequest, 'findUnique')
        .mockResolvedValue(null)

      const result = await repository.getById(requestId)

      expect(result).toBeNull()
    })

    it('should handle database errors during retrieval', async () => {
      const requestId = 'test-request-id'

      // Mock a Prisma client error
      const prismaError = new PrismaClientKnownRequestError(
        'Query engine error',
        {
          code: 'P2023',
          clientVersion: '4.0.0',
        },
      )

      jest
        .spyOn(prismaService.webhookRequest, 'findUnique')
        .mockRejectedValue(prismaError)

      await expect(repository.getById(requestId)).rejects.toThrow(
        PrismaClientKnownRequestError,
      )
    })
  })
})