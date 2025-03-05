import { Module } from '@nestjs/common'
import {
  LandmarksSearchService,
  LandmarksProcessorService,
  LandmarksTransformerService,
  LandmarksService,
} from '../services/landmarks'
import { RepositoryModule } from './repository.module'
import { OverpassModule } from './overpass.module'
import { LandmarksController } from '../controllers/landmarks.controller'
import { CacheServiceModule } from './cache.module'
import { ConfigModule } from '@nestjs/config'
import { AuthGuard } from '../controllers/guard/auth.guard'
import { AuthModule } from './auth.module'

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
