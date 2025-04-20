import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SP001: 'Invalid coordinates',
  SP002: 'Zod Schema validation failed',
  SP003: 'No data provided or empty object',
}

/**
 * Thrown when an auth operation fails.
 */
export class PipeException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
