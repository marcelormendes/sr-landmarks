import { HttpStatus } from '@nestjs/common'

type ErrorCause = {
  type: string
  message: string
}

// Base class for all custom exceptions
export abstract class CustomException extends Error {
  public readonly cause?: ErrorCause

  constructor(
    message: string,
    readonly statusCode: HttpStatus,
    originalError?: CustomException,
  ) {
    super(message)
    if (originalError) {
      this.cause = {
        type: originalError.constructor.name,
        message: originalError.message,
      }
    }
  }
}
