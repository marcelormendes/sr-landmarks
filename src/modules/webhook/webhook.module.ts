import { WebhookController } from '../../controllers/webhook.controller'
import { Module, Logger } from '@nestjs/common'
import { WebhookService } from './webhook.service'
import { ConfigModule } from '@nestjs/config'
import { RepositoryModule } from '../../repositories/repository.module'
import { LandmarksModule } from '../landmarks/landmarks.module'
import { LandmarksQueueModule } from '../landmarks/queue/landmarks-queue.module'
import { AuthModule } from '../auth/auth.module'
import { WebhookRequestRepository } from './webhook-request.repository'

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
  providers: [WebhookService, Logger],
  exports: [WebhookService, WebhookRequestRepository],
})
export class WebhookModule {}
