import { Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '../../landmark.dto'
import { OverpassApiException } from '../../exceptions/api.exceptions'
import { ErrorHandler } from '../../exceptions/error-handling'
import { OverpassApiClient } from './overpass-api.client'
import { OverpassQueryBuilder } from './overpass-query.builder'
import { OverpassResponseProcessor } from './overpass-response.processor'

/**
 * Service responsible for coordinating the Overpass API pipeline.
 * Handles building queries, making API requests, and processing responses.
 */
@Injectable()
export class OverpassPipelineService {
  private readonly logger = new Logger(OverpassPipelineService.name)

  constructor(
    private readonly apiClient: OverpassApiClient,
    private readonly queryBuilder: OverpassQueryBuilder,
    private readonly responseProcessor: OverpassResponseProcessor,
  ) {}

  /**
   * Executes the Overpass API pipeline to fetch landmarks
   */
  async executePipeline(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<LandmarkDto[]> {
    try {
      // Build query
      this.logger.log(`Building query for coordinates (${lat}, ${lng})`)
      const query = this.queryBuilder.buildQuery(lat, lng, radius)

      // Make API request
      this.logger.log('Making API request with query')
      const response = await this.apiClient.makeRequestWithRetry(query)

      // Process response
      this.logger.log('Processing API response')
      return this.responseProcessor.processResponse(response)
    } catch (error) {
      // Log the full error for debugging
      ErrorHandler.handle(error, OverpassApiException, {
        context: 'Overpass pipeline',
        logger: this.logger,
      })
    }
  }
}
