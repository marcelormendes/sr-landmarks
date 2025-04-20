import { Test, TestingModule } from '@nestjs/testing'
import { LandmarksService } from './landmarks.service'
import { LandmarksSearchService } from './landmarks-search.service'
import { HttpStatus, Logger } from '@nestjs/common'
import { roundCoordinate } from '@common/utils/coordinate.util'
import { CacheService } from '@common/cache/cache.service'
import { LandmarkException } from '@modules/landmarks/landmarks.exception'

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

      jest.spyOn(cacheService, 'get').mockResolvedValue(undefined)
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

      const searchSpy = jest.spyOn(
        searchService,
        'searchLandmarksByCoordinates',
      )
      searchSpy.mockResolvedValue(mockLandmarks)

      const result = await service.searchLandmarks(lat, lng)

      expect(searchSpy).toHaveBeenCalled()
      expect(result).toEqual(mockLandmarks)
    })

    describe('error handling', () => {
      const lat = 40.12345
      const lng = -74.54321
      beforeEach(() =>
        jest.spyOn(cacheService, 'get').mockResolvedValue(undefined),
      )

      it.each([
        new LandmarkException('SRL001', HttpStatus.INTERNAL_SERVER_ERROR),
        new LandmarkException('SRL002', HttpStatus.BAD_REQUEST),
        new LandmarkException('SRL003', HttpStatus.NOT_FOUND),
      ])(
        'should throw LandmarkException when search service rejects with %p',
        async (err) => {
          jest
            .spyOn(searchService, 'searchLandmarksByCoordinates')
            .mockRejectedValue(err)
          await expect(service.searchLandmarks(lat, lng)).rejects.toThrow(err)
        },
      )
    })
  })
})
