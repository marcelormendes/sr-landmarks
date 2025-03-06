import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import { LandmarksTransformerService } from './landmarks-transformer.service'
import { LandmarkRepository } from '../../repositories/landmark.repository'
import { encodeGeohash } from '../../utils/coordinate.util'
import { CacheService } from '../cache.service'
/**
 * Service responsible for searching landmarks based on coordinates.
 * Handles the retrieval, transformation, and caching of landmark data.
 */
@Injectable()
export class LandmarksSearchService {
  private readonly logger = new Logger(LandmarksSearchService.name)

  constructor(
    private readonly landmarkRepository: LandmarkRepository,
    private readonly cacheService: CacheService,
    private readonly transformerService: LandmarksTransformerService,
  ) {}

  /**
   * Searches for landmarks near given coordinates using geohash
   * Implements a write-through caching strategy
   */
  public async searchLandmarksByCoordinates(
    lat: number,
    lng: number,
  ): Promise<LandmarkDto[]> {
    const cacheKey = encodeGeohash(lat, lng)
    this.logger.log(`Searching landmarks for cache key: ${cacheKey}`)

    const cachedLandmarks = await this.getCachedLandmarks(cacheKey)
    if (cachedLandmarks) {
      return cachedLandmarks
    }

    return await this.fetchFromDbAndCache(cacheKey)
  }

  private async getCachedLandmarks(
    cacheKey: string,
  ): Promise<LandmarkDto[] | undefined> {
    const cachedData = await this.cacheService.get<LandmarkDto[]>(cacheKey)
    if (cachedData && cachedData.length > 0) {
      this.logger.log(`Cache hit for key ${cacheKey}`)
      return cachedData
    }
    this.logger.debug(`Cache miss for key ${cacheKey}`)
    return undefined
  }

  private async fetchFromDbAndCache(cacheKey: string): Promise<LandmarkDto[]> {
    const dbLandmarks = await this.landmarkRepository.findByGeohash(cacheKey)

    if (!dbLandmarks.length) {
      throw new NotFoundException(
        `No landmarks found for coordinates (${cacheKey})`,
      )
    }

    const landmarkDtos = this.transformerService.transformLandmarks(dbLandmarks)

    await this.cacheService.set(cacheKey, landmarkDtos, 3600)
    this.logger.log(
      `Cached ${landmarkDtos.length} landmarks with key: ${cacheKey}`,
    )

    return landmarkDtos
  }
}
