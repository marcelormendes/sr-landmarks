import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SRL001: 'Landmark processing failed',
  SRL002: 'Invalid coordinates',
  SRL003: 'Landmark not found',
}
/**
 * Thrown when a landmarks operation fails.
 */
export class LandmarkException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
