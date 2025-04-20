import { Logger, Module } from '@nestjs/common'
import { PrismaModule } from '@common/prisma/prisma.module'
import { LandmarkRepository } from './landmark.repository'

@Module({
  imports: [PrismaModule],
  providers: [LandmarkRepository, Logger],
  exports: [LandmarkRepository],
})
export class LandmarkRepositoryModule {}
