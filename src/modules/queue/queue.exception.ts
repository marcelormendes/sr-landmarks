import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'
import errorCodes from './queue.error-codes.json'

/**
 * Thrown when a queue operation fails.
 */
export class QueueException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
