import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'

/**
 * Global exception filter to standardize error responses
 * and provide appropriate error details based on environment
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor() {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // Handle known HttpExceptions (including CustomException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const resBody = exception.getResponse()
      const body =
        typeof resBody === 'string'
          ? { message: resBody }
          : (resBody as Record<string, unknown>)

      return response.status(status).json({
        ...body,
        statusCode: status,
        path: request.url,
      })
    }

    // Fallback for non-HTTP errors
    this.logger.error(
      `Unexpected error type received: ${exception instanceof Error ? exception.constructor.name : typeof exception}`,
      exception instanceof Error ? exception.stack : undefined,
    )
    const status = HttpStatus.INTERNAL_SERVER_ERROR
    return response.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
