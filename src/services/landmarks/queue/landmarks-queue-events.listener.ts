import { Injectable, Logger } from '@nestjs/common'
import {
  QueueEventsHost,
  QueueEventsListener,
  OnQueueEvent,
} from '@nestjs/bullmq'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

/**
 * Listens for events on the landmarks queue
 * Enhanced for distributed environment monitoring
 */
@QueueEventsListener('landmarks')
@Injectable()
export class LandmarksQueueEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(LandmarksQueueEventsListener.name)
  private readonly listenerId: string

  constructor() {
    super()
    // Generate a robust listener identifier that combines hostname with a UUID
    const hostname = os.hostname().split('.')[0] // Get hostname without domain
    const uniqueId = uuidv4().substring(0, 8) // Short UUID for uniqueness
    this.listenerId = `${hostname}-${uniqueId}`

    this.logger.log(
      `Queue event listener initialized with ID: ${this.listenerId}`,
    )
  }

  @OnQueueEvent('completed')
  onCompleted(job: { jobId: string; returnvalue: any; prev?: string }) {
    const result =
      typeof job.returnvalue === 'string'
        ? job.returnvalue
        : JSON.stringify(job.returnvalue)

    this.logger.log(
      `Listener ${this.listenerId} - Job ${job.jobId} completed with result: ${result}`,
    )
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string; prev?: string }) {
    this.logger.error(
      `Listener ${this.listenerId} - Job ${job.jobId} failed with reason: ${job.failedReason}`,
    )
  }

  @OnQueueEvent('active')
  onActive(job: { jobId: string; prev?: string }) {
    this.logger.log(
      `Listener ${this.listenerId} - Job ${job.jobId} is now being processed`,
    )
  }

  @OnQueueEvent('stalled')
  onStalled(job: { jobId: string; prev?: string }) {
    this.logger.warn(
      `Listener ${this.listenerId} - Job ${job.jobId} has stalled - might need recovery`,
    )
  }

  @OnQueueEvent('progress')
  onProgress(job: { jobId: string; data: any; prev?: string }) {
    this.logger.verbose(
      `Listener ${this.listenerId} - Job ${job.jobId} reported progress: ${job.data}%`,
    )
  }

  @OnQueueEvent('waiting')
  onWaiting(jobId: string) {
    this.logger.log(
      `Listener ${this.listenerId} - Job ${jobId} is waiting to be processed`,
    )
  }

  @OnQueueEvent('cleaned')
  onCleaned(jobs: { jobId: string }[], type: string) {
    this.logger.log(
      `Listener ${this.listenerId} - Cleaned ${jobs.length} ${type} jobs`,
    )
  }

  @OnQueueEvent('removed')
  onRemoved(job: { jobId: string; prev?: string }) {
    this.logger.log(
      `Listener ${this.listenerId} - Job ${job.jobId} was removed from the queue`,
    )
  }

  @OnQueueEvent('drained')
  onDrained() {
    this.logger.log(
      `Listener ${this.listenerId} - Queue has been drained, all jobs have been processed`,
    )
  }
}
