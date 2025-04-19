import { Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import { roundCoordinate } from '../../utils/coordinate.util'
import { LandmarksSearchService } from './landmarks-search.service'
import { LandmarkServiceException } from '../../exceptions/api.exceptions'
import { ErrorHandler } from '../../exceptions/error-handling'

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
    } catch (error: unknown) {
      ErrorHandler.handle(error, LandmarkServiceException, {
        context: 'Landmarks service',
      })
    }
  }
}
