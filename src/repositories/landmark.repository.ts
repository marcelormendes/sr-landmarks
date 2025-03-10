import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'
import { Landmark, Prisma } from '@prisma/client'
import { DatabaseException } from '../exceptions/api.exceptions'
import { ErrorHandler } from '../exceptions/error-handling'

/**
 * Repository for handling landmark data persistence operations.
 * Provides methods to create, read, update, and delete landmark records.
 */
@Injectable()
export class LandmarkRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  /**
   * Creates multiple landmark records at once
   */
  public async createMany(
    data: Prisma.LandmarkCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    try {
      return this.prisma.landmark.createMany({ data })
    } catch (error: unknown) {
      return ErrorHandler.handle(error, DatabaseException, {
        context: 'Database operation createMany',
        logger: this.logger,
      })
    }
  }

  /**
   * Finds landmarks by geohash
   */
  public async findByGeohash(geohash: string): Promise<Landmark[]> {
    try {
      return await this.prisma.landmark.findMany({
        where: { geohash },
      })
    } catch (error: unknown) {
      ErrorHandler.handle(error, DatabaseException, {
        context: 'Database operation findByGeohash',
        logger: this.logger,
      })
    }
  }
}
