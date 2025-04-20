import { Module, Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CacheServiceModule } from '@common/cache/cache.module'
import { OverpassApiClient } from '@modules/overpass/services/overpass-api.client'
import { OverpassPipelineService } from '@modules/overpass/services/overpass-pipeline.service'
import { OverpassQueryBuilder } from '@modules/overpass/services/overpass-query.builder'
import { OverpassResponseProcessor } from '@modules/overpass/services/overpass-response.processor'
import { OverpassService } from '@modules/overpass/services/overpass.service'

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
