import { Test, TestingModule } from '@nestjs/testing'
import { LandmarksService } from './landmarks.service'
import { LandmarksSearchService } from './landmarks-search.service'
import { Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { roundCoordinate } from '../../utils/coordinate.util'
import { CacheService } from '../cache.service'

describe('LandmarksService', () => {
  let service: LandmarksService
  let searchService: LandmarksSearchService
  let cacheService: CacheService

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
        LandmarksService,
        {
          provide: LandmarksSearchService,
          useValue: {
            searchLandmarksByCoordinates: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile()

    service = module.get<LandmarksService>(LandmarksService)
    searchService = module.get<LandmarksSearchService>(LandmarksSearchService)
    cacheService = module.get<CacheService>(CacheService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('searchLandmarks', () => {
    it('should call searchLandmarksByCoordinates with rounded coordinates', async () => {
      const lat = 40.12345
      const lng = -74.54321

      const roundedLat = roundCoordinate(lat)
      const roundedLng = roundCoordinate(lng)

      jest.spyOn(cacheService, 'get').mockResolvedValue(null)
      jest
        .spyOn(searchService, 'searchLandmarksByCoordinates')
        .mockResolvedValue(mockLandmarks)

      const result = await service.searchLandmarks(lat, lng)

      expect(searchService.searchLandmarksByCoordinates).toHaveBeenCalledWith(
        roundedLat,
        roundedLng,
      )
      expect(result).toEqual(mockLandmarks)
    })

    it('should use search service to find landmarks', async () => {
      const lat = 40.12345
      const lng = -74.54321

      const searchSpy = jest.spyOn(searchService, 'searchLandmarksByCoordinates')
      searchSpy.mockResolvedValue(mockLandmarks)

      const result = await service.searchLandmarks(lat, lng)

      expect(searchSpy).toHaveBeenCalled()
      expect(result).toEqual(mockLandmarks)
    })

    it('should propagate errors from the search service', async () => {
      const lat = 40.12345
      const lng = -74.54321
      const error = new NotFoundException('Landmarks not found')

      jest.spyOn(cacheService, 'get').mockResolvedValue(null)
      jest
        .spyOn(searchService, 'searchLandmarksByCoordinates')
        .mockRejectedValue(error)

      await expect(service.searchLandmarks(lat, lng)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should handle service unavailable exceptions', async () => {
      const lat = 40.12345
      const lng = -74.54321
      const error = new ServiceUnavailableException('External API unavailable')

      jest.spyOn(cacheService, 'get').mockResolvedValue(null)
      jest
        .spyOn(searchService, 'searchLandmarksByCoordinates')
        .mockRejectedValue(error)

      await expect(service.searchLandmarks(lat, lng)).rejects.toThrow(
        ServiceUnavailableException,
      )
    })
  })
})
