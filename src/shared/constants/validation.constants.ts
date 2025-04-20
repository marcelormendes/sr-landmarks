/**
 * Regex patterns for validation
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Default validation values
 */
export const DEFAULT_SEARCH_RADIUS = 500 // meters
export const MAX_SEARCH_RADIUS = 10000 // meters
export const MIN_SEARCH_RADIUS = 100 // meters

/**
 * Geographical validation constants
 */
export const MIN_LATITUDE = -90
export const MAX_LATITUDE = 90
export const MIN_LONGITUDE = -180
export const MAX_LONGITUDE = 180

/**
 * Cache TTL constants
 */
export const CACHE_TTL_3600_SECONDS = 3600
export const CACHE_TTL_1_HOUR = 1 * 60 * 60
