import { OverpassResponse } from 'src/schemas/overpass.schema'

/**
 * Extended Overpass response interface that includes metadata
 * provided by the Overpass API but not used in our application
 */
export interface OverpassApiResponse extends OverpassResponse {
  version?: number
  generator?: string
  osm3s?: {
    timestamp_osm_base: string
    copyright: string
  }
}
