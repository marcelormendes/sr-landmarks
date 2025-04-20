import { Injectable, Logger } from '@nestjs/common'
import { LandmarkDto } from '@modules/landmarks/landmark.dto'
import { OverpassException } from '../overpass.exception'
import { OverpassApiClient } from '@modules/overpass/services/overpass-api.client'
import { OverpassQueryBuilder } from '@modules/overpass/services/overpass-query.builder'
import { OverpassResponseProcessor } from '@modules/overpass/services/overpass-response.processor'

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
    // Build query
    this.logger.log(`Building query for coordinates (${lat}, ${lng})`)
    const query = this.queryBuilder.buildQuery(lat, lng, radius)

    // Make API request
    this.logger.log('Making API request with query')
    const response = await this.apiClient.makeRequestWithRetry(query)

    // Process response
    this.logger.log('Processing API response')
    return this.responseProcessor.processResponse(response)
  }
}
