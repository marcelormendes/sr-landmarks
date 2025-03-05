import { HttpException } from '@nestjs/common'
import { ERROR_MESSAGES, ERROR_CODES, HTTP_STATUS } from '../constants'

/**
 * Base custom exception class with standardized error structure
 * All domain-specific exceptions should extend this class
 */
export class BaseApiException extends HttpException {
  constructor(
    error: string,
    message: string,
    statusCode: number,
    details?: unknown,
    errorCode?: string,
  ) {
    super(
      {
        error,
        message,
        details,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    )
  }
}

/**
 * Thrown when the Overpass API fails to respond or returns an error
 */
export class OverpassApiException extends BaseApiException {
  constructor(
    message: string = ERROR_MESSAGES.OVERPASS_API_ERROR,
    details?: unknown,
    statusCode: number = HTTP_STATUS.SERVICE_UNAVAILABLE,
  ) {
    super(
      'Overpass API Error',
      message,
      statusCode,
      details,
      ERROR_CODES.SERVICE_UNAVAILABLE,
    )
  }
}

/**
 * Thrown when no landmarks were found for a given search criteria
 */
export class LandmarkNotFoundException extends BaseApiException {
  constructor(
    message: string = ERROR_MESSAGES.LANDMARK_NOT_FOUND,
    details?: unknown,
  ) {
    super(
      'Not Found',
      message,
      HTTP_STATUS.NOT_FOUND,
      details,
      ERROR_CODES.NOT_FOUND,
    )
  }
}

/**
 * Thrown when the provided coordinates are invalid or outside supported bounds
 */
export class InvalidCoordinatesException extends BaseApiException {
  constructor(
    message: string = ERROR_MESSAGES.INVALID_COORDINATES,
    details?: unknown,
  ) {
    super(
      'Bad Request',
      message,
      HTTP_STATUS.BAD_REQUEST,
      details,
      ERROR_CODES.BAD_REQUEST,
    )
  }
}

/**
 * Thrown when a cache operation fails
 */
export class CacheException extends BaseApiException {
  constructor(message: string = 'Cache operation failed', details?: unknown) {
    super(
      'Cache Error',
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      details,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    )
  }
}

/**
 * Thrown when a database operation fails
 */
export class DatabaseException extends BaseApiException {
  constructor(
    message: string = ERROR_MESSAGES.DATABASE_ERROR,
    details?: unknown,
  ) {
    super(
      'Database Error',
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      details,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
    )
  }
}
