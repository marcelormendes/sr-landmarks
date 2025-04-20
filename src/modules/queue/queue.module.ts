import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LandmarksQueueService } from './queue.service'
import { LandmarksQueueConsumer } from './queue.consumer'
import { LandmarksQueueEventsListener } from './queue-events.listener'
import { LandmarksProcessorService } from '@modules/landmarks/services/landmarks-processor.service'
import { LANDMARKS_QUEUE } from '@shared/constants/queue.constants'
import { WebhookRequestRepository } from '@modules/webhook/webhook-request.repository'
import { LandmarksModule } from '@modules/landmarks/landmarks.module'
import { WebhookRepositoryModule } from '@modules/webhook/webhook-request.repository.module'
import { OverpassModule } from '@modules/overpass/overpass.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: LANDMARKS_QUEUE,
      // Job options applied to all jobs in this queue
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
    WebhookRepositoryModule,
    LandmarksModule,
    ConfigModule,
    OverpassModule,
  ],
  providers: [
    LandmarksQueueService,
    {
      provide: LandmarksQueueConsumer,
      useFactory: (
        configService: ConfigService,
        landmarksProcessorService: LandmarksProcessorService,
        webhookRequestRepository: WebhookRequestRepository,
      ) => {
        const serviceType = configService.get<string>('SERVICE_TYPE')
        if (serviceType === 'api') {
          return null // Don't create the consumer for API-only mode
        }
        return new LandmarksQueueConsumer(
          landmarksProcessorService,
          webhookRequestRepository,
        )
      },
      inject: [
        ConfigService,
        LandmarksProcessorService,
        WebhookRequestRepository,
      ],
    },
    {
      provide: LandmarksQueueEventsListener,
      useFactory: (configService: ConfigService) => {
        const serviceType = configService.get<string>('SERVICE_TYPE')
        if (serviceType === 'api') {
          return null // Don't create the listener for API-only mode
        }
        return new LandmarksQueueEventsListener()
      },
      inject: [ConfigService],
    },
  ],
  exports: [LandmarksQueueService, BullModule],
})
export class LandmarksQueueModule {}
