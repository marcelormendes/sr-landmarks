/**
 * Interface representing the structure of error responses
 */
export interface HttpExceptionResponse {
  statusCode: number
  error: string
  message: string | string[]
  details?: unknown
  errorCode?: string
  timestamp: string
  path: string
}

/**
 * Interface for error response objects extracted from exceptions
 */
export interface ErrorResponse {
  error?: string
  message?: string | string[]
  details?: unknown
  errorCode?: string
  [key: string]: unknown
}
