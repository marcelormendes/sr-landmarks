import { Request } from 'express'

/**
 * Payload for JWT tokens
 */
export interface JwtPayload {
  sub: string
  apiKey: string
  iat?: number
  exp?: number
}

/**
 * Custom request interface that extends Express Request with user property
 */
export interface RequestWithUser extends Request {
  user: Record<string, unknown>
}
