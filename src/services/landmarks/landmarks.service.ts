import { Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import { roundCoordinate } from '../../utils/coordinate.util'
import { LandmarksSearchService } from './landmarks-search.service'

/**
 * Service for handling landmark-related operations.
 * This service acts as the main entry point for landmark search functionality.
 */
@Injectable()
export class LandmarksService {
  private readonly logger = new Logger(LandmarksService.name)

  /**
   * Service constructor
   */
  constructor(
    private readonly landmarksSearchService: LandmarksSearchService,
  ) {}

  /**
   * Searches for landmarks within a specified radius of given coordinates
   * Uses a geohash-based caching strategy
   */
  public async searchLandmarks(
    lat: number,
    lng: number,
  ): Promise<LandmarkDto[]> {
    // Round coordinates for consistency
    const roundedLat = roundCoordinate(lat)
    const roundedLng = roundCoordinate(lng)

    try {
      // Try to find landmarks in database or cache
      return await this.landmarksSearchService.searchLandmarksByCoordinates(
        roundedLat,
        roundedLng,
      )
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof Error) {
        throw error
      }

      // If no landmarks are found, process new landmarks from Overpass API
      this.logger.log(
        `No landmarks found for this lat: ${roundedLat} and lng: ${roundedLng}`,
      )
      return []
    }
  }
}
