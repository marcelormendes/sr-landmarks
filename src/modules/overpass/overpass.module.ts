import { Module, Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CacheServiceModule } from '../cache.module'
import { OverpassApiClient } from './overpass-api.client'
import { OverpassPipelineService } from './overpass-pipeline.service'
import { OverpassQueryBuilder } from './overpass-query.builder'
import { OverpassResponseProcessor } from './overpass-response.processor'
import { OverpassService } from './overpass.service'

/**
 * Module for handling Overpass API integration.
 * Provides services for querying and processing data from the Overpass API.
 * Exports OverpassService for use in other modules.
 */
@Module({
  imports: [ConfigModule, CacheServiceModule],
  providers: [
    Logger,
    OverpassApiClient,
    OverpassQueryBuilder,
    OverpassResponseProcessor,
    OverpassPipelineService,
    OverpassService,
  ],
  exports: [OverpassService],
})
export class OverpassModule {}
