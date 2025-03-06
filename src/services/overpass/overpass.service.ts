import { Injectable } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import { OverpassApiClient } from './overpass-api.client'
import { OverpassQueryBuilder } from './overpass-query.builder'
import { OverpassResponseProcessor } from './overpass-response.processor'
import { createTestSafeLogger } from '../../utils/test-utils'
import { CacheService } from '../cache.service'
import { CACHE_TTL_3600_SECONDS } from '../../constants/validation.constants'
import { OverpassApiResponse } from '../../interfaces/overpass.api.response'
import { pipelineAsync } from '../../utils/pipeline.util'

/**
 * Service for interacting with the Overpass API to find nearby landmarks.
 * Uses a pipeline pattern for API operations and proper error propagation.
 */
@Injectable()
export class OverpassService {
  private readonly logger = createTestSafeLogger(OverpassService.name)

  constructor(
    private readonly apiClient: OverpassApiClient,
    private readonly queryBuilder: OverpassQueryBuilder,
    private readonly responseProcessor: OverpassResponseProcessor,
    private readonly cacheService: CacheService,
  ) {}
  /**
   * Finds landmarks near the specified coordinates within the given radius
   * Throws errors to allow proper handling of failed requests
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

      // If not in cache, fetch from API using our pipeline
      this.logger.log(
        `Fetching landmarks from API for coordinates (${lat}, ${lng})`,
      )

      const landmarksDto = await pipelineAsync<
        { lat: number; lng: number; radius: number },
        LandmarkDto[]
      >({ lat, lng, radius }, [
        this.buildQueryStep,
        this.makeApiRequestStep,
        this.processResponseStep,
      ])

      // Save to cache
      await this.cacheService.set(geohash, landmarksDto, CACHE_TTL_3600_SECONDS)
      return landmarksDto
    } catch (error: unknown) {
      const err = error as Error
      this.logger.error(`Failed to fetch landmarks: ${err.message}`, err.stack)

      // Try to get from cache as a fallback
      const cachedData = await this.getFromCacheAsFallback(geohash)
      if (cachedData) {
        return cachedData
      }
      // This will allow the webhook request to be marked as failed
      throw error
    }
  }

  private async getFromCacheAsFallback(
    geohash: string,
  ): Promise<LandmarkDto[] | void> {
    const cachedData = await this.cacheService.get<LandmarkDto[]>(geohash)
    if (cachedData && cachedData.length > 0) {
      this.logger.warn(
        `Using cached data as fallback after error for ${geohash}`,
      )
      return cachedData
    }
  }

  private buildQueryStep = async (coords: {
    lat: number
    lng: number
    radius: number
  }) => {
    this.logger.log(
      `Building query for coordinates (${coords.lat}, ${coords.lng})`,
    )
    return Promise.resolve(
      this.queryBuilder.buildQuery(coords.lat, coords.lng, coords.radius),
    )
  }

  private makeApiRequestStep = async (query: string) => {
    this.logger.log('Making API request with query')
    return this.apiClient.makeRequestWithRetry(query)
  }

  private processResponseStep = async (response: OverpassApiResponse) => {
    this.logger.log('Processing API response')
    return Promise.resolve(this.responseProcessor.processResponse(response))
  }
}
