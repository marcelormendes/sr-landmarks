import { Injectable } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'
import { Landmark, Prisma } from '@prisma/client'
import { DatabaseException } from '../exceptions/api.exceptions'
import { createTestSafeLogger } from '../utils/test-utils'

/**
 * Repository for handling landmark data persistence operations.
 * Provides methods to create, read, update, and delete landmark records.
 */
@Injectable()
export class LandmarkRepository {
  private readonly logger = createTestSafeLogger(LandmarkRepository.name)
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates multiple landmark records at once
   */
  async createMany(data: Prisma.LandmarkCreateManyInput[]) {
    return this.prisma.landmark.createMany({ data })
  }

  /**
   * Finds landmarks by geohash
   */
  async findByGeohash(geohash: string): Promise<Landmark[]> {
    try {
      return await this.prisma.landmark.findMany({
        where: { geohash },
      })
    } catch (error: unknown) {
      const err = error as Error
      this.logger.error(
        `Database error in findByGeohash: ${err.message}`,
        err.stack,
      )
      throw new DatabaseException(
        `Failed to retrieve landmarks by geohash: ${err.message}`,
      )
    }
  }
}
