import { WebhookController } from '../controllers/webhook.controller'
import { WebhookService } from '../services/webhook.service'
import { Module } from '@nestjs/common'
import { LandmarksModule } from './landmarks.module'
import { ConfigModule } from '@nestjs/config'
import { RepositoryModule } from './repository.module'
import { LandmarksQueueModule } from './landmarks-queue.module'
import { AuthModule } from './auth.module'

/**
 * Module for webhook functionality.
 * Registers WebhookController for handling incoming webhook requests.
 * Provides and exports WebhookService for coordinate processing.
 * Imports:
 * - LandmarksModule for landmarks processing
 * - RepositoryModule for data persistence operations
 * - ConfigModule for accessing application configuration
 * - LandmarksQueueModule for asynchronous processing
 */
@Module({
  imports: [
    ConfigModule,
    LandmarksModule,
    RepositoryModule,
    LandmarksQueueModule,
    AuthModule, // Required for JwtService used by AuthGuard
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
