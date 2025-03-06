import { Injectable } from '@nestjs/common'
import { LandmarkDto } from '../../dto/landmark.dto'
import {
  OverpassResponse,
  OverpassElement,
} from '../../schemas/overpass.schema'

/**
 * Processor for handling Overpass API responses.
 * Transforms raw API responses into application-specific landmark objects.
 */
@Injectable()
export class OverpassResponseProcessor {
  /**
   * Processes the response from the Overpass API into an array of landmarks
   * Filters invalid elements and transforms each element
   */
  public processResponse(response: OverpassResponse): LandmarkDto[] {
    return response.elements
      .filter((element) => element.center || (element.lat && element.lon))
      .map((element) => this.processElement(element))
  }

  /**
   * Processes a single element from the Overpass API response
   * Extracts coordinates, name, and type
   */
  private processElement(element: OverpassElement): LandmarkDto {
    const centerLat = element.center?.lat || element.lat!
    const centerLng = element.center?.lon || element.lon!
    const name = element.tags?.name || 'Unnamed Landmark'
    const type = element.tags?.tourism || 'attraction'

    return {
      name,
      type,
      center: {
        lat: centerLat,
        lng: centerLng,
      },
    }
  }
}
