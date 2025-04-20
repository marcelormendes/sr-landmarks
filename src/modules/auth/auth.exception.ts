import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'
import errorCodes from './auth.error-codes.json'

/**
 * Thrown when an auth operation fails.
 */
export class AuthException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.UNAUTHORIZED,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
