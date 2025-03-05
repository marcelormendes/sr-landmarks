/**
 * Error messages for API exceptions
 */
export const ERROR_MESSAGES = {
  LANDMARK_NOT_FOUND: 'Landmark not found',
  WEBHOOK_REQUEST_NOT_FOUND: 'Webhook request not found',
  INVALID_COORDINATES: 'Invalid coordinates provided',
  OVERPASS_API_ERROR: 'Error fetching data from Overpass API',
  INVALID_UUID: 'Invalid UUID format',
  INVALID_WEBHOOK_PAYLOAD: 'Invalid webhook payload',
  DATABASE_ERROR: 'Database operation failed',
  QUEUE_ERROR: 'Failed to add job to the queue',
}

/**
 * Error codes for API exceptions
 */
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
}
