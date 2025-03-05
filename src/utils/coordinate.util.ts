import * as geohash from 'ngeohash'

/**
 * Rounds a coordinate to 6 decimal places (approximately 0.1m precision)
 */
export const roundCoordinate = (coordinate: number): number => {
  return Math.round(coordinate * 1000000) / 1000000
}

/**
 * Encodes a coordinate pair into a geohash
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Precision of the geohash (default: 8)
 * @returns Geohash string
 */
export const encodeGeohash = (
  lat: number,
  lng: number,
  precision = 8,
): string => {
  return geohash.encode(lat, lng, precision)
}

/**
 * Decodes a geohash into its coordinates
 *
 * @param hash Geohash string
 * @returns Object with lat and lng properties
 */
export const decodeGeohash = (hash: string): { lat: number; lng: number } => {
  const decoded = geohash.decode(hash)
  return { lat: decoded.latitude, lng: decoded.longitude }
}
