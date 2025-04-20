import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SRW001: 'Webhook processing failed',
  SRW002: 'Webhook not found',
  SRW003: 'Error on adding job on queue',
}

/**
 * Thrown when a webhook operation fails.
 */
export class WebhookException extends CustomException {
  constructor(
    errorCode: string,
    status: number = HttpStatus.NOT_FOUND,
    details?: unknown,
  ) {
    const message = errorCodes[errorCode]
    super(message, status, details, errorCode)
  }
}
