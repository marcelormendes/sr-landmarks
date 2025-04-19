import { HttpStatus } from '@nestjs/common'

type ErrorCause = {
  type: string
  message: string
}

// Base class for all custom exceptions
export abstract class CustomException extends Error {
  public readonly cause?: ErrorCause
  public readonly errorCode: string
  public readonly details?: unknown

  constructor(
    message: string,
    readonly statusCode: HttpStatus,
    originalError?: CustomException,
  ) {
    super(message)
    this.errorCode = this.constructor.name
    if (originalError) {
      this.cause = {
        type: originalError.constructor.name,
        message: originalError.message,
      }
    }
  }
}
