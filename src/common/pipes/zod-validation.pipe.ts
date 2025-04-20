import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ZodSchema } from 'zod'
import { PipeException } from './pipe.exception'

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
        throw new PipeException('SP003', HttpStatus.BAD_REQUEST)
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
        throw new PipeException('SP003', HttpStatus.BAD_REQUEST, error)
      }

      if (
        this.schema.description?.includes('landmark') ||
        _metadata.data?.includes('lat') ||
        _metadata.data?.includes('lng')
      ) {
        throw new PipeException('SP001', HttpStatus.BAD_REQUEST, error)
      }

      throw new PipeException('SP002', HttpStatus.BAD_REQUEST, error)
    }
  }
}
