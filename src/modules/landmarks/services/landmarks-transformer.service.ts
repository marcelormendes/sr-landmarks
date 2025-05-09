import { Injectable } from '@nestjs/common'
import { LandmarkDto } from '../landmark.dto'
import { Landmark as PrismaLandmark } from '@prisma/client'

/**
 * Service responsible for transforming landmark data.
 * Handles conversion between database entities and DTOs.
 */
@Injectable()
export class LandmarksTransformerService {
  /**
   * Transforms database landmark entities to DTOs
   */
  transformLandmarks(landmarks: PrismaLandmark[]): LandmarkDto[] {
    // Transform database entities to DTOs
    return landmarks.map((landmark) => ({
      name: landmark.name || 'Unnamed Landmark',
      type: landmark.type,
      center: {
        lat: landmark.centerLat,
        lng: landmark.centerLng,
      },
      ...(landmark.address && { address: landmark.address }),
      ...(landmark.wiki ||
      landmark.website ||
      landmark.openingHours ||
      landmark.accessibility ||
      landmark.tourism
        ? {
            moreInfo: {
              ...(landmark.wiki && { wiki: landmark.wiki }),
              ...(landmark.website && { website: landmark.website }),
              ...(landmark.openingHours && {
                openingHours: landmark.openingHours,
              }),
              ...(landmark.accessibility && {
                accessibility: landmark.accessibility,
              }),
              ...(landmark.tourism && { tourism: landmark.tourism }),
            },
          }
        : {}),
    }))
  }
}
