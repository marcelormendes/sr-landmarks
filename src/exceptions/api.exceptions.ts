import { CustomException } from './custom.exceptions'

/**
 * Base custom exception class with standardized error structure
 * All domain-specific exceptions should extend this class
 */
export class BaseApiException extends CustomException {
  constructor(
    error: string,
    message: string,
    statusCode: number,
    details?: unknown,
    errorCode?: string,
  ) {
    super(message, statusCode)
    this.error = error
    this.details = details
    this.errorCode = errorCode
    this.timestamp = new Date().toISOString()
  }

  error: string
  message: string
  details?: unknown
  errorCode?: string
  timestamp: string
}

/**
 * Thrown when the Overpass API fails to respond or returns an error
 */
export class OverpassApiException extends CustomException {}

/**
 * Thrown when no landmarks were found for a given search criteria
 */
export class LandmarkNotFoundException extends CustomException {}

/**
 * Thrown when the provided coordinates are invalid or outside supported bounds
 */
export class InvalidCoordinatesException extends CustomException {}

/**
 * Thrown when a cache operation fails
 */
export class CacheException extends CustomException {}

/**
 * Thrown when a database operation fails
 */
export class DatabaseException extends CustomException {}

/**
 * Thrown when a landmark processing operation fails
 */
export class LandmarkQueueConsumerException extends CustomException {}

/**
 * Thrown when a configuration error occurs
 */
export class ConfigurationException extends CustomException {}

/**
 * Thrown when an unauthorized request is made
 */
export class AuthUnAuthorizedException extends CustomException {}

/**
 * Thrown when a webhook request fails
 */
export class WebhookControllerException extends CustomException {}

/**
 * Thrown when a Zod validation error occurs
 */
export class ZodCustomError extends CustomException {}

/**
 * Thrown when a webhook service error occurs
 */
export class WebhookServiceException extends CustomException {}

/**
 * Thrown when a landmark service error occurs
 */
export class LandmarkServiceException extends CustomException {}
