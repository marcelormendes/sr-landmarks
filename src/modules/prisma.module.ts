import { Module } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'

/**
 * Module for database connectivity via Prisma ORM.
 * Provides and exports PrismaService for database operations.
 * Used by other modules to access the database.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
