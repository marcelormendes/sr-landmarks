import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Custom exception for transformation errors
 */
export class TransformationError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
