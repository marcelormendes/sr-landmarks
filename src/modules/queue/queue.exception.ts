import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SQR001: 'Task consuming failed',
  SQR002: 'Queue publishing failed',
}

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
