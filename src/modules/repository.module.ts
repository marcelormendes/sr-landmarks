import { Module } from '@nestjs/common'
import { LandmarkRepository } from '../repositories/landmark.repository'
import { WebhookRequestRepository } from '../repositories/webhook-request.repository'
import { PrismaModule } from './prisma.module'

/**
 * Module for repository-related functionality.
 * Provides repositories for data access operations.
 * Imports PrismaModule for database connectivity.
 * Exports repositories for use in other modules.
 */
@Module({
  imports: [PrismaModule],
  providers: [LandmarkRepository, WebhookRequestRepository],
  exports: [LandmarkRepository, WebhookRequestRepository],
})
export class RepositoryModule {}
