import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ZodSchema } from 'zod'
import {
  InvalidCoordinatesException,
  ZodCustomError,
} from '@common/exceptions/api.exceptions'
import { ErrorHandler } from '@common/exceptions/error-handling'

@Injectable()
export class EnhancedZodValidationPipe implements PipeTransform {
  constructor(
    private schema: ZodSchema,
    private logger: Logger,
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    try {
      // If we have no value or an empty object
      if (
        !value ||
        (typeof value === 'object' && Object.keys(value).length === 0)
      ) {
        this.logger.error('No data provided or empty object')
        throw new ZodCustomError('No data provided', HttpStatus.BAD_REQUEST)
      }

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

      return this.schema.parse(rawValue)
    } catch (error: unknown) {
      // If we have no value or an empty object
      if (
        !value ||
        (typeof value === 'object' && Object.keys(value).length === 0)
      ) {
        this.logger.error('No data provided or empty object')
        throw new ZodCustomError('No data provided', HttpStatus.BAD_REQUEST)
      }

      if (
        this.schema.description?.includes('landmark') ||
        _metadata.data?.includes('lat') ||
        _metadata.data?.includes('lng')
      ) {
        throw new InvalidCoordinatesException(
          'Invalid coordinates or parameters',
          HttpStatus.BAD_REQUEST,
        )
      }

      ErrorHandler.handle(error, ZodCustomError, {
        context: 'Zod validation pipe',
        logger: this.logger,
      })
    }
  }
}
