/**
 * Authentication scheme constants
 */
export const BEARER_AUTH_TYPE = 'Bearer'

/**
 * JWT constants
 */
export const JWT_CONSTANTS = {
  secret: process.env.JWT_SECRET || 'superRareLandmarksSecretKey2025!',
  expiresIn: '1h',
}

/**
 * Auth metadata keys
 */
export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Auth error messages
 */
export const AUTH_ERROR_MESSAGES = {
  MISSING_AUTH_HEADER: 'Missing authorization header',
  INVALID_AUTH_TYPE: 'Invalid authorization type',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Token is invalid',
}

export const ONE_HOUR = 3600

export const BEARER = 'Bearer'
