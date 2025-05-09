import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { OverpassService } from '@modules/overpass/services/overpass.service'
import { CacheService } from '@common/cache/cache.service'
import { LandmarksTransformerService } from './landmarks-transformer.service'
import { LandmarkDto } from '../landmark.dto'
import { LandmarkRepository } from '../landmark.repository'
import { encodeGeohash } from '@common/utils/coordinate.util'
import { CACHE_TTL_3600_SECONDS } from '@shared/constants/validation.constants'
import { LandmarkException } from '../landmarks.exception'

/**
 * Service responsible for processing landmark data from coordinates.
 * Handles fetching, storing, and retrieving landmark information.
 * Implements a write-through caching strategy.
 */
@Injectable()
export class LandmarksProcessorService {
  private readonly logger = new Logger(LandmarksProcessorService.name)

  constructor(
    private readonly landmarkRepository: LandmarkRepository,
    private readonly overpassService: OverpassService,
    private readonly cacheService: CacheService,
    private readonly transformerService: LandmarksTransformerService,
  ) {}

  /**
   * Processes landmarks for given coordinates by retrieving data from the Overpass API,
   * storing in the database, and caching the results.
   */
  public async processLandmarksByCoordinates(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<LandmarkDto[]> {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new LandmarkException('SRL002', HttpStatus.BAD_REQUEST)
    }

    // Create geohash for the coordinates
    const geohash = encodeGeohash(lat, lng)
    this.logger.log(
      `Processing landmarks for coordinates (${lat}, ${lng}) with geohash: ${geohash}`,
    )

    // Check cache first
    const cachedLandmarks = await this.getCachedLandmarks(geohash)
    if (cachedLandmarks) {
      return cachedLandmarks
    }

    // Check database next
    const dbLandmarks = await this.getDbLandmarks(geohash)
    if (dbLandmarks) {
      return dbLandmarks
    }

    // Fetch from Overpass API if not found in cache or database
    return await this.fetchFromApiAndSave(lat, lng, radius, geohash)
  }

  /**
   * Tries to retrieve landmarks from the cache
   */
  private async getCachedLandmarks(
    geohash: string,
  ): Promise<LandmarkDto[] | undefined> {
    const cachedLandmarks = await this.cacheService.get<LandmarkDto[]>(geohash)
    if (cachedLandmarks && cachedLandmarks.length > 0) {
      this.logger.log(
        `Found ${cachedLandmarks.length} cached landmarks for geohash ${geohash}`,
      )
      return cachedLandmarks
    }
    return undefined
  }

  /**
   * Tries to retrieve landmarks from the database and caches them if found
   */
  private async getDbLandmarks(
    geohash: string,
  ): Promise<LandmarkDto[] | undefined> {
    const existingLandmarks =
      await this.landmarkRepository.findByGeohash(geohash)

    if (existingLandmarks && existingLandmarks.length > 0) {
      this.logger.log(
        `Found ${existingLandmarks.length} existing landmarks in database for geohash ${geohash}`,
      )

      const landmarksDto =
        this.transformerService.transformLandmarks(existingLandmarks)
      // Ensure landmarks are cached
      await this.cacheService.set(geohash, landmarksDto, CACHE_TTL_3600_SECONDS)

      return landmarksDto
    }

    return undefined
  }

  /**
   * Fetches landmarks from the Overpass API, saves them to the database,
   * and caches the results
   */
  private async fetchFromApiAndSave(
    lat: number,
    lng: number,
    radius: number,
    geohash: string,
  ): Promise<LandmarkDto[]> {
    // Fetch landmarks from Overpass API
    const landmarksDto = await this.overpassService.findNearbyLandmarks(
      lat,
      lng,
      radius,
      geohash,
    )

    if (!landmarksDto) {
      return []
    }

    this.logger.log(
      `Retrieved ${landmarksDto.length} landmarks from Overpass API`,
    )

    if (landmarksDto.length > 0) {
      // Save landmarks to database with geohash
      await this.saveLandmarksWithGeohash(geohash, landmarksDto)

      // Cache the results
      await this.cacheService.set(geohash, landmarksDto, CACHE_TTL_3600_SECONDS)
    }

    return landmarksDto
  }

  /**
   * Saves landmark data to the database with associated geohash
   */
  private async saveLandmarksWithGeohash(
    geohash: string,
    landmarks: LandmarkDto[],
  ): Promise<void> {
    this.logger.debug(
      `Saving ${landmarks.length} landmarks with geohash ${geohash}`,
    )

    const landmarkEntities = landmarks.map((landmark) => ({
      name: landmark.name,
      type: landmark.type,
      centerLat: landmark.center.lat,
      centerLng: landmark.center.lng,
      geohash: geohash,
      ...(landmark.address && { address: landmark.address }),
      ...(landmark.moreInfo?.wiki && { wiki: landmark.moreInfo.wiki }),
      ...(landmark.moreInfo?.website && { website: landmark.moreInfo.website }),
      ...(landmark.moreInfo?.openingHours && {
        openingHours: landmark.moreInfo.openingHours,
      }),
      ...(landmark.moreInfo?.accessibility && {
        accessibility: landmark.moreInfo.accessibility,
      }),
      ...(landmark.moreInfo?.tourism && { tourism: landmark.moreInfo.tourism }),
    }))

    await this.landmarkRepository.createMany(landmarkEntities)
  }
}
