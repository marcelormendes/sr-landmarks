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
      ((value as Record<string, unknown>) &&
        Object.keys(value as Record<string, unknown>).length === 0)
    ) {
      throw new BadRequestException('No data provided')
    }

    try {
      // Get the raw object if it's a class instance
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

        // For coordinates-related schemas, use the specialized exception
        if (
          this.schema.description?.includes('coordinate') ||
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
      throw error
    }
  }
}
