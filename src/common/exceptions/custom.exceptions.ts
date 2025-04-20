import { HttpException, HttpStatus, Logger } from '@nestjs/common'

export interface ApiErrorPayload {
  message: string
  details?: unknown
  errorCode?: string
  timestamp: string
}

export class CustomException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
    errorCode?: string,
  ) {
    const body: ApiErrorPayload = {
      message,
      details,
      errorCode,
      timestamp: new Date().toISOString(),
    }
    Logger.error(`${errorCode}: ${message}`, status, details)
    super(body, status)
  }
}
