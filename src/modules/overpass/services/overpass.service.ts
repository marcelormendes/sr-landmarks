import { Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '@modules/landmarks/landmark.dto'
import { CacheService } from '@common/cache/cache.service'
import { OverpassPipelineService } from '@modules/overpass/services/overpass-pipeline.service'
import { OverpassException } from '@modules/overpass/overpass.exception'
import { HttpStatus } from '@nestjs/common'

/**
 * Service for interacting with the Overpass API to find nearby landmarks.
 * Handles caching and coordinates the pipeline execution.
 */
@Injectable()
export class OverpassService {
  private readonly logger = new Logger(OverpassService.name)

  constructor(
    private readonly pipelineService: OverpassPipelineService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Finds landmarks near the specified coordinates within the given radius
   * Uses caching with fallback strategy
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

      // If not in cache, execute pipeline
      this.logger.log(
        `Fetching landmarks from API for coordinates (${lat}, ${lng})`,
      )
      const landmarksDto = await this.pipelineService.executePipeline(
        lat,
        lng,
        radius,
      )

      return landmarksDto
    } catch (error: unknown) {
      // Try to get from cache as a fallback
      const cachedData = await this.getFromCacheAsFallback(geohash)
      if (cachedData) {
        return cachedData
      }

      throw new OverpassException(
        'SRO001',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
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
}
