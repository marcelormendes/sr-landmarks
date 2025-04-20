import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '../landmark.dto'
import { roundCoordinate } from '@common/utils/coordinate.util'
import { LandmarksSearchService } from './landmarks-search.service'
import { LandmarkException } from '../landmarks.exception'

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
      return this.landmarksSearchService.searchLandmarksByCoordinates(
        roundedLat,
        roundedLng,
      )
    } catch (error) {
      throw new LandmarkException(
        'SRL001',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      )
    }
  }
}
