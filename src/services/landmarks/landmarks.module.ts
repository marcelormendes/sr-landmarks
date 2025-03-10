import { Logger, Module } from '@nestjs/common'
import { LandmarksService } from './landmarks.service'
import { LandmarksSearchService } from './landmarks-search.service'
import { LandmarksProcessorService } from './landmarks-processor.service'
import { LandmarksTransformerService } from './landmarks-transformer.service'
import { OverpassModule } from '../overpass/overpass.module'
import { CacheServiceModule } from '../cache.module'
import { AuthModule } from '../auth/auth.module'
import { RepositoryModule } from '../../repositories/repository.module'
import { LandmarksController } from '../../controllers/landmarks.controller'
import { ConfigModule } from '@nestjs/config'
import { AuthGuard } from '../../controllers/guard/auth.guard'

/**
 * Module managing landmark-related functionality
 * Coordinates landmark retrieval, search, and transformation logic
 */
@Module({
  controllers: [LandmarksController],
  imports: [
    RepositoryModule,
    OverpassModule,
    CacheServiceModule,
    ConfigModule, // Required for AuthGuard
    AuthModule, // Required for JwtService used by AuthGuard
  ],
  providers: [
    Logger,
    // Auth guard for API protection
    AuthGuard,

    // Core landmarks services
    LandmarksService,
    LandmarksSearchService,
    LandmarksProcessorService,
    LandmarksTransformerService,
  ],
  exports: [
    LandmarksService,
    LandmarksSearchService,
    LandmarksProcessorService,
    LandmarksTransformerService,
  ],
})
export class LandmarksModule {}
