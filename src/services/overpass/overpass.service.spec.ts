import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { OverpassService } from './overpass.service'
import { OverpassApiClient } from './overpass-api.client'
import { OverpassQueryBuilder } from './overpass-query.builder'
import { OverpassResponseProcessor } from './overpass-response.processor'
import { OverpassApiResponse } from '../../interfaces/overpass.api.response'
import { CacheService } from '../cache.service'
import { encodeGeohash } from '../../utils/coordinate.util'
import { LandmarksTransformerService } from '../landmarks/landmarks-transformer.service'

// Create a mock logger that doesn't log during tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
}

describe('OverpassService', () => {
  let service: OverpassService
  let apiClient: OverpassApiClient
  let cacheHandler: CacheService

  const mockLandmarks = [
    {
      name: 'Test Landmark',
      type: 'attraction',
      distance: 100,
      center: { lat: 40.1, lng: -74.5 },
    },
  ]

  // Use explicit type casting to match OverpassApiResponse
  const mockOverpassResponse: OverpassApiResponse = {
    elements: [
      {
        id: 123,
        type: 'way', // This is now constrained by the type declaration
        tags: { name: 'Test Landmark', tourism: 'attraction' },
        center: { lat: 40.1, lon: -74.5 },
      },
    ],
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverpassService,
        OverpassApiClient,
        OverpassQueryBuilder,
        OverpassResponseProcessor,
        CacheService,
        LandmarksTransformerService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'overpass.url')
                return 'https://overpass-api.de/api/interpreter'
              if (key === 'overpass.timeout') return 30000
              if (key === 'overpass.maxRetries') return 3
              return undefined
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: 'CacheService',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: 'LandmarksTransformerService',
          useValue: {
            transformLandmarks: jest.fn().mockReturnValue(mockLandmarks),
          },
        },
      ],
    })
      .overrideProvider(OverpassApiClient)
      .useValue({
        makeRequestWithRetry: jest.fn(),
      })
      .overrideProvider(OverpassQueryBuilder)
      .useValue({
        buildQuery: jest.fn().mockReturnValue('mock query'),
      })
      .overrideProvider(OverpassResponseProcessor)
      .useValue({
        processResponse: jest.fn().mockReturnValue(mockLandmarks),
      })
      .overrideProvider(CacheService)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
      })
      .compile()

    service = module.get<OverpassService>(OverpassService)
    apiClient = module.get<OverpassApiClient>(OverpassApiClient)
    cacheHandler = module.get<CacheService>(CacheService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findNearbyLandmarks', () => {
    const lat = 40.0
    const lng = -74.0
    const radius = 500
    const geohash = encodeGeohash(lat, lng)

    it('should return cached landmarks if available', async () => {
      jest.spyOn(cacheHandler, 'get').mockResolvedValue(mockLandmarks)

      const result = await service.findNearbyLandmarks(lat, lng, radius, geohash)

      expect(cacheHandler.get).toHaveBeenCalled()
      expect(result).toEqual(mockLandmarks)
      expect(apiClient.makeRequestWithRetry).not.toHaveBeenCalled()
    })

    it('should fetch landmarks from Overpass API if not in cache', async () => {
      jest.spyOn(cacheHandler, 'get').mockResolvedValue(undefined)
      jest
        .spyOn(apiClient, 'makeRequestWithRetry')
        .mockResolvedValue(mockOverpassResponse)

      const result = await service.findNearbyLandmarks(lat, lng, radius, geohash)

      expect(cacheHandler.get).toHaveBeenCalled()
      expect(apiClient.makeRequestWithRetry).toHaveBeenCalledWith('mock query')
      expect(cacheHandler.set).toHaveBeenCalled()
      expect(result).toEqual(mockLandmarks)
    })

    it('should handle API errors and throw', async () => {
      jest
        .spyOn(apiClient, 'makeRequestWithRetry')
        .mockRejectedValue(new Error('API error'))

      await expect(
        service.findNearbyLandmarks(lat, lng, radius, geohash)
      ).rejects.toThrow('API error')
    })
  })
})
