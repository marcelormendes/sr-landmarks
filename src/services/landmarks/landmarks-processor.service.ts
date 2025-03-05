import { Injectable, Logger } from '@nestjs/common'
import { OverpassService } from '../overpass/overpass.service'
import { LandmarkDto } from '../../dto/landmark.dto'
import { LandmarkRepository } from '../../repositories/landmark.repository'
import { CacheService } from '../cache.service'
import { encodeGeohash } from '../../utils/coordinate.util'
import { LandmarksTransformerService } from './landmarks-transformer.service'

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
  async processLandmarksByCoordinates(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<LandmarkDto[]> {
    // Create geohash for the coordinates
    const geohash = encodeGeohash(lat, lng)

    // check if the geohash is already in the cache
    const cachedLandmarks = await this.cacheService.get<LandmarkDto[]>(geohash)
    if (cachedLandmarks) {
      this.logger.log(
        `Found ${cachedLandmarks.length} cached landmarks for geohash ${geohash}`,
      )
      return cachedLandmarks
    }

    this.logger.log(
      `Processing landmarks for coordinates (${lat}, ${lng}) with geohash: ${geohash}`,
    )

    // Check for existing landmarks in database with this geohash
    const existingLandmarks =
      await this.landmarkRepository.findByGeohash(geohash)

    if (existingLandmarks && existingLandmarks.length > 0) {
      this.logger.log(
        `Found ${existingLandmarks.length} existing landmarks for geohash ${geohash}`,
      )

      const landmarksDto =
        this.transformerService.transformLandmarks(existingLandmarks)
      // Ensure landmarks are cached
      await this.cacheService.set(geohash, landmarksDto, 3600)

      return landmarksDto
    }

    // Fetch landmarks from Overpass API
    const landmarksDto = await this.overpassService.findNearbyLandmarks(
      lat,
      lng,
      radius,
      geohash,
    )

    this.logger.log(
      `Retrieved ${landmarksDto.length} landmarks from Overpass API`,
    )

    if (landmarksDto.length > 0) {
      // Save landmarks to database with geohash
      await this.saveLandmarksWithGeohash(geohash, landmarksDto)

      // Cache the results
      await this.cacheService.set(geohash, landmarksDto, 3600)
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
      geohash: geohash, // Store the geohash with each landmark
    }))

    await this.landmarkRepository.createMany(landmarkEntities)
  }
}
