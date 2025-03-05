import { Injectable } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import { OverpassApiClient } from './overpass-api.client'
import { OverpassQueryBuilder } from './overpass-query.builder'
import { OverpassResponseProcessor } from './overpass-response.processor'
import { createTestSafeLogger } from '../../utils/test-utils'
import { CacheService } from '../cache.service'
import { LandmarksTransformerService } from '../landmarks/landmarks-transformer.service'

/**
 * Service for interacting with the Overpass API to find nearby landmarks.
 * Coordinates the process of querying, processing responses, and caching results.
 */
@Injectable()
export class OverpassService {
  private readonly logger = createTestSafeLogger(OverpassService.name)

  constructor(
    private readonly apiClient: OverpassApiClient,
    private readonly queryBuilder: OverpassQueryBuilder,
    private readonly responseProcessor: OverpassResponseProcessor,
    private readonly cacheService: CacheService,
    private readonly transformerService: LandmarksTransformerService,
  ) {}

  /**
   * Finds landmarks near the specified coordinates within the given radius
   * Uses cache when available and falls back to graceful degradation on failures
   */
  async findNearbyLandmarks(
    lat: number,
    lng: number,
    radius: number,
    geohash: string,
  ): Promise<LandmarkDto[]> {
    try {
      // Check cache first
      const cachedData = await this.cacheService.get<LandmarkDto[]>(geohash)
      if (cachedData) {
        this.logger.log(`Using cached landmarks for geohash ${geohash}`)
        return cachedData
      }

      // If not in cache, fetch from API
      this.logger.log(
        `Fetching landmarks from API for coordinates (${lat}, ${lng})`,
      )
      const query = this.queryBuilder.buildQuery(lat, lng, radius)
      const result = await this.apiClient.makeRequestWithRetry(query)
      const landmarksDto = this.responseProcessor.processResponse(result)

      // Save to cache
      await this.cacheService.set(geohash, landmarksDto, 3600)
      return landmarksDto
    } catch (error: unknown) {
      const err = error as Error
      this.logger.error(`Failed to fetch landmarks: ${err.message}`, err.stack)

      // Fallback strategy - return empty array or cached data even if expired
      const cachedData = await this.cacheService.get<LandmarkDto[]>(geohash)
      return cachedData || []
    }
  }
}
