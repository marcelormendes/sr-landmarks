import { Module } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'

/**
 * Module for Zod schema validation integration.
 * Registers a global validation pipe using Zod schemas.
 * Enables automatic validation of request payloads across the application.
 */
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class ZodModule {}
