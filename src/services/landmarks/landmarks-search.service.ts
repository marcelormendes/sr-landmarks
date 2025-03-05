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
  async searchLandmarksByCoordinates(
    lat: number,
    lng: number,
  ): Promise<LandmarkDto[]> {
    const geohash = encodeGeohash(lat, lng)
    // Keep key consistent with other cache operations
    const cacheKey = geohash
    this.logger.log(
      `Searching landmarks with geohash: ${geohash}, cache key: ${cacheKey}`,
    )

    // First try to get from cache
    const cachedData = await this.cacheService.get<LandmarkDto[]>(cacheKey)

    this.logger.debug(
      `Cache lookup result for ${cacheKey}: ${cachedData ? 'hit' : 'miss'}`,
    )

    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      this.logger.log(
        `Cache hit for geohash ${geohash}. Found ${cachedData.length} landmarks`,
      )
      return cachedData
    }

    // If not in cache, get from database
    const dbLandmarks = await this.landmarkRepository.findByGeohash(geohash)

    if (dbLandmarks && dbLandmarks.length > 0) {
      this.logger.log(
        `Database hit for geohash ${geohash}. Found ${dbLandmarks.length} landmarks`,
      )

      // Transform DB entities to DTOs
      const landmarkDtos =
        this.transformerService.transformLandmarks(dbLandmarks)

      // Ensure we have valid data before caching
      if (
        landmarkDtos &&
        Array.isArray(landmarkDtos) &&
        landmarkDtos.length > 0
      ) {
        // Cache the results
        this.logger.log(
          `Caching ${landmarkDtos.length} landmarks with key: ${cacheKey}`,
        )
        await this.cacheService.set(cacheKey, landmarkDtos, 3600)
      } else {
        this.logger.warn(
          `Not caching empty or invalid landmark data for ${geohash}`,
        )
      }

      return landmarkDtos
    }

    // If not found in database either, we don't have landmarks for these coordinates
    throw new NotFoundException(
      `No landmarks found for coordinates (${geohash})`,
    )
  }
}
