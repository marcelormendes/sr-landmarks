import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { CustomException } from './custom.exceptions'

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

    // If it's not a CustomException, something went wrong with our error handling
    if (!(exception instanceof CustomException)) {
      this.logger.error(
        `Unexpected error type received: ${exception instanceof Error ? exception.constructor.name : typeof exception}`,
        exception instanceof Error ? exception.stack : undefined,
      )

      return response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
      })
    }

    // Handle CustomException
    return response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(exception.cause && { cause: exception.cause }),
    })
  }
}
