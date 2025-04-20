import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { LandmarksProcessorService } from './landmarks-processor.service'
import { LandmarkRepository } from '@modules/landmarks/landmark.repository'
import { OverpassService } from '@modules/overpass/services/overpass.service'
import { CacheService } from '@common/cache/cache.service'
import { encodeGeohash } from '@common/utils/coordinate.util'
import { LandmarksTransformerService } from './landmarks-transformer.service'
import { TransformationError } from '@common/exceptions/transformation.exceptions'

describe('LandmarksProcessorService', () => {
  let service: LandmarksProcessorService
  let landmarkRepository: LandmarkRepository
  let overpassService: OverpassService
  let cacheService: CacheService
  let transformerService: LandmarksTransformerService

  const mockLandmarks = [
    {
      name: 'Test Landmark',
      type: 'attraction',
      center: { lat: 40.1, lng: -74.5 },
    },
  ]

  const mockDbLandmarks = [
    {
      id: 1,
      name: 'Test Landmark',
      type: 'attraction',
      centerLat: 40.1,
      centerLng: -74.5,
      geohash: 'dr4ur8r',
      address: null,
      wiki: null,
      website: null,
      openingHours: null,
      accessibility: null,
      tourism: null,
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandmarksProcessorService,
        Logger,
        LandmarksTransformerService,
        {
          provide: LandmarkRepository,
          useValue: {
            findByGeohash: jest.fn(),
            createMany: jest.fn(),
          },
        },
        {
          provide: OverpassService,
          useValue: {
            findNearbyLandmarks: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(LandmarksProcessorService)
    landmarkRepository = module.get(LandmarkRepository)
    overpassService = module.get(OverpassService)
    cacheService = module.get(CacheService)
    transformerService = module.get(LandmarksTransformerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('processLandmarksByCoordinates', () => {
    const lat = 40.0
    const lng = -74.0
    const radius = 500
    const geohash = encodeGeohash(lat, lng)

    it('should return existing landmarks if found in database', async () => {
      // Mock database returning existing landmarks
      jest
        .spyOn(landmarkRepository, 'findByGeohash')
        .mockResolvedValue(mockDbLandmarks)
      jest.spyOn(cacheService, 'set').mockResolvedValue()

      const result = await service.processLandmarksByCoordinates(
        lat,
        lng,
        radius,
      )

      expect(landmarkRepository.findByGeohash).toHaveBeenCalledWith(geohash)
      expect(cacheService.set).toHaveBeenCalledWith(
        geohash,
        expect.any(Array),
        3600,
      )
      expect(overpassService.findNearbyLandmarks).not.toHaveBeenCalled()
      expect(result).toHaveLength(mockDbLandmarks.length)
      expect(result[0]).toHaveProperty('name', mockDbLandmarks[0].name)
      expect(result[0]).toHaveProperty('type', mockDbLandmarks[0].type)
    })

    it('should fetch landmarks from Overpass API when none exist in database', async () => {
      // Mock empty database result
      jest.spyOn(landmarkRepository, 'findByGeohash').mockResolvedValue([])
      jest
        .spyOn(overpassService, 'findNearbyLandmarks')
        .mockResolvedValue(mockLandmarks)
      jest
        .spyOn(landmarkRepository, 'createMany')
        .mockResolvedValue({ count: mockLandmarks.length })
      jest.spyOn(cacheService, 'set').mockResolvedValue()

      const result = await service.processLandmarksByCoordinates(
        lat,
        lng,
        radius,
      )

      expect(landmarkRepository.findByGeohash).toHaveBeenCalledWith(geohash)
      expect(overpassService.findNearbyLandmarks).toHaveBeenCalledWith(
        lat,
        lng,
        radius,
        geohash,
      )
      expect(landmarkRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: mockLandmarks[0].name,
            type: mockLandmarks[0].type,
            geohash,
          }),
        ]),
      )
      expect(cacheService.set).toHaveBeenCalledWith(
        geohash,
        mockLandmarks,
        3600,
      )
      expect(result).toEqual(mockLandmarks)
    })

    it('should not store in database if no landmarks are found from API', async () => {
      // Mock empty database result and empty API result
      jest.spyOn(landmarkRepository, 'findByGeohash').mockResolvedValue([])
      jest.spyOn(overpassService, 'findNearbyLandmarks').mockResolvedValue([])

      const result = await service.processLandmarksByCoordinates(
        lat,
        lng,
        radius,
      )

      expect(landmarkRepository.findByGeohash).toHaveBeenCalledWith(geohash)
      expect(overpassService.findNearbyLandmarks).toHaveBeenCalledWith(
        lat,
        lng,
        radius,
        geohash,
      )
      expect(landmarkRepository.createMany).not.toHaveBeenCalled()
      expect(cacheService.set).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should handle database connection errors', async () => {
      jest
        .spyOn(landmarkRepository, 'findByGeohash')
        .mockRejectedValue(new Error('Database connection failed'))

      await expect(
        service.processLandmarksByCoordinates(lat, lng, radius),
      ).rejects.toThrow('Database connection failed')

      expect(overpassService.findNearbyLandmarks).not.toHaveBeenCalled()
    })

    it('should handle Overpass service errors', async () => {
      jest.spyOn(landmarkRepository, 'findByGeohash').mockResolvedValue([])
      jest
        .spyOn(overpassService, 'findNearbyLandmarks')
        .mockRejectedValue(new Error('Overpass API error'))

      await expect(
        service.processLandmarksByCoordinates(lat, lng, radius),
      ).rejects.toThrow('Overpass API error')
    })

    it('should handle cache service errors', async () => {
      jest
        .spyOn(landmarkRepository, 'findByGeohash')
        .mockResolvedValue(mockDbLandmarks)
      jest
        .spyOn(cacheService, 'set')
        .mockRejectedValue(new Error('Cache service error'))

      await expect(
        service.processLandmarksByCoordinates(lat, lng, radius),
      ).rejects.toThrow('Cache service error')
    })

    it('should handle transformation errors', async () => {
      jest
        .spyOn(landmarkRepository, 'findByGeohash')
        .mockResolvedValue(mockDbLandmarks)
      jest
        .spyOn(transformerService, 'transformLandmarks')
        .mockImplementation(() => {
          throw new TransformationError('Transformation failed')
        })

      await expect(
        service.processLandmarksByCoordinates(lat, lng, radius),
      ).rejects.toThrow('Transformation failed')
    })

    it('should handle invalid geohash errors', async () => {
      const invalidLat = 91 // Invalid latitude
      await expect(
        service.processLandmarksByCoordinates(invalidLat, lng, radius),
      ).rejects.toThrow('Invalid coordinates')
    })
  })

  describe('saveLandmarksWithGeohash', () => {
    it('should convert DTO landmarks to entities with geohash', async () => {
      const geohash = 'dr4ur8r'
      jest
        .spyOn(landmarkRepository, 'createMany')
        .mockResolvedValue({ count: mockLandmarks.length })

      await service['saveLandmarksWithGeohash'](geohash, mockLandmarks)

      expect(landmarkRepository.createMany).toHaveBeenCalledWith([
        {
          name: mockLandmarks[0].name,
          type: mockLandmarks[0].type,
          centerLat: mockLandmarks[0].center.lat,
          centerLng: mockLandmarks[0].center.lng,
          geohash,
        },
      ])
    })
  })
})
