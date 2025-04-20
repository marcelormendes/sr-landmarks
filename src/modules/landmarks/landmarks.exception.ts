import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'
import errorCodes from './landmarks.error-codes.json'

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
