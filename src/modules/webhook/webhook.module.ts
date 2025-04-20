import { WebhookController } from '@modules/webhook/webhook.controller'
import { Module, Logger } from '@nestjs/common'
import { WebhookService } from '@modules/webhook/webhook.service'
import { ConfigModule } from '@nestjs/config'
import { LandmarksModule } from '@modules/landmarks/landmarks.module'
import { LandmarksQueueModule } from '@modules/queue/queue.module'
import { AuthModule } from '@modules/auth/auth.module'
import { WebhookRepositoryModule } from './webhook-request.repository.module'

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
    LandmarksQueueModule,
    AuthModule, // Required for JwtService used by AuthGuard
    WebhookRepositoryModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, Logger],
  exports: [WebhookService],
})
export class WebhookModule {}
