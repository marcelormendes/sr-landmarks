import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { OverpassService } from './overpass.service'
import { CacheService } from '../cache.service'
import { OverpassPipelineService } from './overpass-pipeline.service'
import { encodeGeohash } from '../../utils/coordinate.util'

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
  let pipelineService: OverpassPipelineService
  let cacheHandler: CacheService

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
      providers: [
        OverpassService,
        {
          provide: OverpassPipelineService,
          useValue: {
            executePipeline: jest.fn(),
          },
        },
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
      ],
    }).compile()

    service = module.get<OverpassService>(OverpassService)
    pipelineService = module.get<OverpassPipelineService>(OverpassPipelineService)
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
      expect(pipelineService.executePipeline).not.toHaveBeenCalled()
    })

    it('should fetch landmarks from Overpass API if not in cache', async () => {
      jest.spyOn(cacheHandler, 'get').mockResolvedValue(undefined)
      jest
        .spyOn(pipelineService, 'executePipeline')
        .mockResolvedValue(mockLandmarks)

      const result = await service.findNearbyLandmarks(lat, lng, radius, geohash)

      expect(cacheHandler.get).toHaveBeenCalled()
      expect(pipelineService.executePipeline).toHaveBeenCalledWith(
        lat,
        lng,
        radius,
      )
      expect(result).toEqual(mockLandmarks)
    })

    it('should handle API errors and throw', async () => {
      jest.spyOn(cacheHandler, 'get').mockResolvedValue(undefined)
      jest
        .spyOn(pipelineService, 'executePipeline')
        .mockRejectedValue(new Error('API error'))

      await expect(
        service.findNearbyLandmarks(lat, lng, radius, geohash),
      ).rejects.toThrow('API error')
    })
  })
})
