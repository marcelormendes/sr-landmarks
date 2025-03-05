import { HttpStatus } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'

/**
 * API documentation for the Landmarks endpoints
 */
export const LandmarksApiDocs = {
  QUERIES: {
    LAT: {
      name: 'lat',
      description: 'Latitude (decimal degrees)',
      example: '40.7128',
    },
    LNG: {
      name: 'lng',
      description: 'Longitude (decimal degrees)',
      example: '-74.0060',
    },
    RADIUS: {
      name: 'radius',
      description: 'Search radius in meters (default: 500)',
      required: false,
      example: '1000',
    },
  },

  OPERATIONS: {
    GET_LANDMARKS: {
      summary: 'Get landmarks near specified coordinates',
      description:
        'Returns a list of landmarks within the specified radius around the given coordinates',
    },
  },

  RESPONSES: {
    OK: {
      status: HttpStatus.OK,
      description: 'Landmarks retrieved successfully',
      type: LandmarkDto,
      isArray: true,
    },
    NOT_FOUND: {
      status: HttpStatus.NOT_FOUND,
      description: 'No landmarks found in the specified area',
    },
    BAD_REQUEST: {
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid coordinates or parameters',
    },
    TOO_MANY_REQUESTS: {
      status: HttpStatus.TOO_MANY_REQUESTS,
      description: 'Rate limit exceeded',
    },
  },
}
