import { Module, Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import {
  OverpassService,
  OverpassApiClient,
  OverpassQueryBuilder,
  OverpassResponseProcessor,
  OverpassPipelineService,
} from '../services/overpass'
import { CacheServiceModule } from './cache.module'

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
