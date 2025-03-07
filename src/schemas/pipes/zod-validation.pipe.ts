import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common'
import { ZodError, ZodSchema } from 'zod'
import { InvalidCoordinatesException } from '../../exceptions/api.exceptions'
import { createTestSafeLogger } from '../../utils/test-utils'

@Injectable()
export class EnhancedZodValidationPipe implements PipeTransform {
  private readonly logger = createTestSafeLogger(EnhancedZodValidationPipe.name)

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    // If we have no value or an empty object
    if (
      !value ||
      (typeof value === 'object' && Object.keys(value).length === 0)
    ) {
      this.logger.error('No data provided or empty object')
      throw new BadRequestException('No data provided')
    }

    try {
      // If it's a primitive type (string, number, etc), use it directly
      if (typeof value !== 'object' || value === null) {
        return this.schema.parse(value)
      }

      // For objects, handle as before
      const objValue = value as { constructor?: { name?: string } }

      const rawValue =
        objValue.constructor?.name === 'Object'
          ? value
          : Object.assign({}, value)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = this.schema.parse(rawValue)
      return result
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        this.logger.error(
          `Validation error: ${JSON.stringify(formattedErrors)}`,
        )
        this.logger.error(`Original error: ${JSON.stringify(error.errors)}`)

        // For coordinates-related schemas, use the specialized exception
        if (
          this.schema.description?.includes('landmark') ||
          _metadata.data?.includes('lat') ||
          _metadata.data?.includes('lng')
        ) {
          throw new InvalidCoordinatesException(
            'Invalid coordinates or parameters',
            formattedErrors,
          )
        } else {
          // For other schemas, use the general BadRequestException
          throw new BadRequestException({
            message: 'Validation failed',
            details: formattedErrors,
          })
        }
      }

      // Log and re-throw other errors
      const err = error as Error
      this.logger.error(`Unexpected validation error: ${err.message}`)
      this.logger.error(`Error stack: ${err.stack}`)
      throw error
    }
  }
}
