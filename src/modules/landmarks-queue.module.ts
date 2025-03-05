import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule } from '@nestjs/config'
import { LandmarksQueueService } from '../services/landmarks/queue/landmarks-queue.service'
import { LandmarksQueueConsumer } from '../services/landmarks/queue/landmarks-queue.consumer'
import { LandmarksQueueEventsListener } from '../services/landmarks/queue/landmarks-queue-events.listener'
import { LandmarksModule } from './landmarks.module'
import { LANDMARKS_QUEUE } from '../constants/queue.constants'
import { RepositoryModule } from './repository.module'

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
    LandmarksQueueConsumer,
    LandmarksQueueEventsListener,
  ],
  exports: [LandmarksQueueService, BullModule],
})
export class LandmarksQueueModule {}
