import { HttpStatus } from '@nestjs/common'
import { CustomException } from './custom.exceptions'

/**
 * Custom exception for transformation errors
 */
export class TransformationError extends CustomException {
  constructor(message: string, details?: unknown) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, details)
  }
}
