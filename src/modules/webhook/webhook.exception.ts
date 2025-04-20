import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'
import errorCodes from './webhook.error-codes.json'

/**
 * Thrown when a webhook operation fails.
 */
export class WebhookException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
