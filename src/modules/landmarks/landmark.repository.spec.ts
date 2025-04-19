import { Test, TestingModule } from '@nestjs/testing'
import { LandmarkRepository } from './landmark.repository'
import { PrismaService } from '@common/prisma/prisma.service'
import { DatabaseException } from '@common/exceptions/api.exceptions'
import { Logger } from '@nestjs/common'

describe('LandmarkRepository', () => {
  let repository: LandmarkRepository
  let prismaService: PrismaService

  const mockLandmark = {
    id: 1,
    name: 'Test Landmark',
    type: 'attraction',
    centerLat: 40.0,
    centerLng: -74.0,
    geohash: 'dr4ur8r',
    address: null,
    website: null,
    openingHours: null,
    accessibility: null,
    tourism: null,
    wiki: null
  }

  const mockLandmarks = [mockLandmark]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandmarkRepository,
        {
          provide: PrismaService,
          useValue: {
            landmark: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile()

    repository = module.get<LandmarkRepository>(LandmarkRepository)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(repository).toBeDefined()
  })


  describe('createMany', () => {
    it('should create many landmarks', async () => {
      const landmarksData = [
        {
          name: 'Test Landmark 1',
          type: 'attraction',
          centerLat: 40.0,
          centerLng: -74.0,
          geohash: 'dr4ur8r',
          address: null,
          website: null,
          openingHours: null,
          accessibility: null,
          tourism: null,
          wiki: null
        },
      ]

      jest
        .spyOn(prismaService.landmark, 'createMany')
        .mockResolvedValue({ count: 1 })

      await repository.createMany(landmarksData)

      expect(prismaService.landmark.createMany).toHaveBeenCalledWith({
        data: landmarksData,
      })
    })
  })


  describe('findByGeohash', () => {
    it('should find landmarks by geohash', async () => {
      const geohash = 'dr4ur8r'
      
      jest
        .spyOn(prismaService.landmark, 'findMany')
        .mockResolvedValue(mockLandmarks)

      const result = await repository.findByGeohash(geohash)

      expect(prismaService.landmark.findMany).toHaveBeenCalledWith({
        where: { geohash },
      })
      expect(result).toEqual(mockLandmarks)
    })
    
    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(prismaService.landmark, 'findMany')
        .mockRejectedValue(new Error('DB error'))

      await expect(repository.findByGeohash('dr4ur8r')).rejects.toThrow(DatabaseException)
    })
  })
})