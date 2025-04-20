import { HttpStatus } from '@nestjs/common'
import { CustomException } from '@common/exceptions/custom.exceptions'

export const errorCodes: Record<string, string> = {
  SRO001: 'Overpass API processing failed',
  SRO002: 'Overpass API URL is missing',
  SRO003: 'Overpass timeout is missing',
  SRO004: 'Overpass max retries is missing',
}
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
