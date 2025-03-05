/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}

/**
 * Common response messages
 */
export const RESPONSE_MESSAGES = {
  WEBHOOK_RECEIVED: 'Webhook received and processing started',
  REQUEST_SUCCESSFUL: 'Request successful',
  HEALTH_CHECK_PASSED: 'Health check passed',
}
