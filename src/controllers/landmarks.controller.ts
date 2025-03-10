import { Controller, Get, Query, Logger, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { LandmarksService } from '../services/landmarks/landmarks.service'
import { LandmarkDto, LandmarkDtoApi } from '../dto/landmark.dto'
import { EnhancedZodValidationPipe } from '../schemas/pipes/zod-validation.pipe'
import { LandmarksApiDocs } from './docs/api-docs'
import { HTTP_STATUS } from '../constants'
import { Public } from '../decorators/public.decorator'
import { LandmarksSchema, LandmarkLocation } from '../schemas/landmarks.schema'

/**
 * Controller for handling landmark-related API endpoints
 * All endpoints are public (no authentication required)
 */
@ApiTags('landmarks')
@Public()
@Controller('landmarks')
export class LandmarksController {
  private readonly logger = new Logger(LandmarksController.name)

  constructor(private landmarksService: LandmarksService) {}

  /**
   * Retrieve landmarks near the specified coordinates
   */
  @Get()
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation(LandmarksApiDocs.OPERATIONS.GET_LANDMARKS)
  @ApiQuery(LandmarksApiDocs.QUERIES.LAT)
  @ApiQuery(LandmarksApiDocs.QUERIES.LNG)
  @ApiResponse({
    status: 200,
    description: 'Landmarks retrieved successfully',
    type: LandmarkDtoApi,
    isArray: true,
  })
  @ApiResponse(LandmarksApiDocs.RESPONSES.NOT_FOUND)
  @ApiResponse(LandmarksApiDocs.RESPONSES.BAD_REQUEST)
  @ApiResponse(LandmarksApiDocs.RESPONSES.TOO_MANY_REQUESTS)
  async getLandmarks(
    @Query(
      new EnhancedZodValidationPipe(
        LandmarksSchema,
        new Logger('LandmarkValidation'),
      ),
    )
    coordinates: LandmarkLocation,
  ): Promise<LandmarkDto[]> {
    this.logger.log(
      `Retrieving landmarks for coordinates: lat=${coordinates.lat}, lng=${coordinates.lng}`,
    )

    return this.landmarksService.searchLandmarks(
      coordinates.lat,
      coordinates.lng,
    )
  }
}
