import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@common/prisma/prisma.service'
import { Landmark, Prisma } from '@prisma/client'

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
    // Perform bulk create; let database exceptions bubble up
    return this.prisma.landmark.createMany({ data })
  }

  /**
   * Finds landmarks by geohash
   */
  public async findByGeohash(geohash: string): Promise<Landmark[]> {
    // Perform query; let exceptions bubble up
    return this.prisma.landmark.findMany({ where: { geohash } })
  }
}
