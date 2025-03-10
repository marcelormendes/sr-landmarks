import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LandmarksQueueService } from './landmarks-queue.service'
import { LandmarksQueueConsumer } from './landmarks-queue.consumer'
import { LandmarksQueueEventsListener } from './landmarks-queue-events.listener'
import { LandmarksProcessorService } from '../landmarks-processor.service'
import { LANDMARKS_QUEUE } from '../../../constants/queue.constants'
import { RepositoryModule } from '../../../repositories/repository.module'
import { WebhookRequestRepository } from '../../../repositories/webhook-request.repository'
import { LandmarksModule } from '../landmarks.module'

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
    LandmarksModule,
    ConfigModule,
    // Import repository module to provide WebhookRequestRepository
    RepositoryModule,
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
