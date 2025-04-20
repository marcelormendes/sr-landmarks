import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SRA001: 'Invalid credentials',
  SRA002: 'Token expired or invalid',
  SRA003: 'Authentication required',
}

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
