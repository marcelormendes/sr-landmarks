import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Service for Prisma ORM operations.
 * Handles database connections and provides a typed interface to the database.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Initializes a new instance of PrismaClient
   */
  constructor() {
    super()
  }

  /**
   * Establishes a connection to the database when the module initializes
   */
  async onModuleInit() {
    await this.$connect()
  }

  /**
   * Closes the database connection when the module is destroyed
   */
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
