import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'
import errorCodes from './overpass.error-codes.json'

/**
 * Thrown when an Overpass API operation fails.
 */
export class OverpassException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.BAD_GATEWAY,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
