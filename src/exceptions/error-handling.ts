import { HttpStatus, Logger } from '@nestjs/common'
import { ZodError } from 'zod'
import { CustomException } from './custom.exceptions'

type ErrorHandlerOptions = {
  context: string
  logger?: Logger
  metadata?: Record<string, unknown>
}

export class ErrorHandler {
  static handle<T extends CustomException>(
    error: unknown,
    ExceptionType: new (
      message: string,
      statusCode: HttpStatus,
      originalError?: CustomException,
    ) => T,
    options: ErrorHandlerOptions,
  ): never {
    const { context, logger, metadata = {} } = options

    if (logger) {
      logger.error(`Error in ${context}:`, {
        error,
        ...metadata,
      })
    }

    if (error instanceof CustomException) {
      if (error instanceof ExceptionType) {
        throw error
      }
      throw new ExceptionType(
        `${context} failed: ${error.message}`,
        error.statusCode,
        error,
      )
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((e) => e.message).join(', ')
      throw new ExceptionType(
        `${context} validation failed: ${validationErrors}`,
        HttpStatus.BAD_REQUEST,
      )
    }

    // Handle standard errors
    if (error instanceof Error) {
      throw new ExceptionType(
        `${context} failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    // Handle unknown errors
    throw new ExceptionType(
      `${context} failed: Unknown error occurred`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function isError(error: unknown): error is Error {
  return error instanceof Error
}
