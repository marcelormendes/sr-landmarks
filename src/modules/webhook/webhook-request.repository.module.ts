import { Logger, Module } from '@nestjs/common'
import { WebhookRequestRepository } from './webhook-request.repository'
import { PrismaModule } from '@common/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [WebhookRequestRepository, Logger],
  exports: [WebhookRequestRepository],
})
export class WebhookRepositoryModule {}
