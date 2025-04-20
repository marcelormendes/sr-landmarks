import { Logger, Module } from '@nestjs/common'
import { LandmarksService } from './services/landmarks.service'
import { LandmarksSearchService } from './services/landmarks-search.service'
import { LandmarksProcessorService } from './services/landmarks-processor.service'
import { LandmarksTransformerService } from './services/landmarks-transformer.service'
import { OverpassModule } from '@modules/overpass/overpass.module'
import { CacheServiceModule } from '@common/cache/cache.module'
import { AuthModule } from '@modules/auth/auth.module'
import { LandmarksController } from '@modules/landmarks/landmarks.controller'
import { ConfigModule } from '@nestjs/config'
import { AuthGuard } from '@common/guards/auth.guard'
import { LandmarkRepositoryModule } from './landmark.repository.module'
/**
 * Module managing landmark-related functionality
 * Coordinates landmark retrieval, search, and transformation logic
 */
@Module({
  controllers: [LandmarksController],
  imports: [
    OverpassModule,
    CacheServiceModule,
    ConfigModule, // Required for AuthGuard
    AuthModule, // Required for JwtService used by AuthGuard
    LandmarkRepositoryModule,
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
