import { Module, Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import {
  OverpassService,
  OverpassApiClient,
  OverpassQueryBuilder,
  OverpassResponseProcessor,
} from '../services/overpass'
import { CacheServiceModule } from './cache.module'
import { LandmarksTransformerService } from '../services/landmarks/landmarks-transformer.service'

/**
 * Module for handling Overpass API integration.
 * Provides services for querying and processing data from the Overpass API.
 * Exports OverpassService for use in other modules.
 */
@Module({
  imports: [ConfigModule, CacheServiceModule],
  providers: [
    Logger,
    OverpassService,
    OverpassApiClient,
    OverpassQueryBuilder,
    OverpassResponseProcessor,
    LandmarksTransformerService,
  ],
  exports: [OverpassService],
})
export class OverpassModule {}
