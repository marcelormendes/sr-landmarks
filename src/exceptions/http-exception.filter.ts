import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { ZodError } from 'zod'
import {
  ErrorResponse,
  HttpExceptionResponse,
} from '../interfaces/error.interface'

/**
 * Global exception filter to standardize error responses
 * and provide appropriate error details based on environment
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)
  private readonly isProduction: boolean

  constructor(private configService?: ConfigService) {
    // If ConfigService is available, determine if in production
    this.isProduction = configService?.get('env') === 'production'
  }

  catch(exception: Error | HttpException | ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // Determine HTTP status code
    const status = this.getStatus(exception)

    // Extract error information
    const errorResponseData = this.extractErrorResponse(exception)

    // Get client IP for logging
    const clientIp = this.getClientIp(request)

    // Log detailed error info with additional context
    const method = String(request.method || '')
    const url = String(request.url || '')
    const errorType = String(errorResponseData.error || 'Error')
    const errorMessage = String(errorResponseData.message || '')

    this.logger.error(
      `[${clientIp}] ${method} ${url} - Status: ${status} - ${errorType}: ${errorMessage}`,
      this.isProduction
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : '',
    )

    // Prepare response object
    const responseBody: HttpExceptionResponse = {
      statusCode: status,
      error: errorResponseData.error || 'Error',
      message: errorResponseData.message || 'An unexpected error occurred',
      // Only include details in non-production environments or for non-500 errors
      details:
        this.isProduction && status === 500
          ? undefined
          : errorResponseData.details,
      errorCode: errorResponseData.errorCode,
      timestamp: new Date().toISOString(),
      path: String(request.url),
    }

    // Remove undefined fields
    this.removeUndefinedFields(responseBody)

    response.status(status).json(responseBody)
  }

  /**
   * Extracts and normalizes error information from different exception types
   */
  private extractErrorResponse(exception: unknown): ErrorResponse {
    // Handle HttpException
    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse() as string | ErrorResponse

      if (typeof errorResponse === 'string') {
        return {
          error: exception.name,
          message: errorResponse,
        }
      }

      return {
        error: errorResponse.error || exception.name,
        message: errorResponse.message || 'An error occurred',
        details: errorResponse.details,
        errorCode: errorResponse.errorCode,
      }
    }

    // Handle ZodError (validation errors)
    if (exception instanceof ZodError) {
      return {
        error: 'Validation Error',
        message: 'Invalid input data',
        details: exception.errors,
        errorCode: 'VALIDATION_ERROR',
      }
    }

    // Handle standard Error objects
    if (exception instanceof Error) {
      return {
        error: exception.name || 'Error',
        message: exception.message || 'An unexpected error occurred',
      }
    }

    // Handle unknown exceptions
    return {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }
  }

  /**
   * Determines the HTTP status code based on exception type
   */
  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus()
    }

    if (exception instanceof ZodError) {
      return HttpStatus.BAD_REQUEST
    }

    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  /**
   * Gets the client IP address from the request
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for']
    const forwardedIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0] : undefined

    return forwardedIp || request.socket.remoteAddress || 'unknown'
  }

  /**
   * Removes undefined fields from an object
   */
  private removeUndefinedFields(obj: HttpExceptionResponse): void {
    Object.keys(obj).forEach((key) => {
      if (obj[key as keyof HttpExceptionResponse] === undefined) {
        delete obj[key as keyof HttpExceptionResponse]
      }
    })
  }
}
