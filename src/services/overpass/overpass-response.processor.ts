import { Injectable } from '@nestjs/common'
import { LandmarkDto, MoreInfoDto } from '../../dto/landmark.dto'
import {
  OverpassResponse,
  OverpassElement,
} from '../../schemas/overpass.schema'
import {
  OVERPASS_TYPE_HIERARCHY,
  DEFAULT_LANDMARK_TYPE,
  OVERPASS_TAGS,
  OVERPASS_ADDRESS_TAGS,
} from '../../constants/overpass.constants'

/**
 * Processor for handling Overpass API responses.
 * Transforms raw API responses into application-specific landmark objects.
 */
@Injectable()
export class OverpassResponseProcessor {
  /**
   * Processes the response from the Overpass API into an array of landmarks
   */
  public processResponse(response: OverpassResponse): LandmarkDto[] {
    return this.removeDuplicates(response.elements)
      .filter((element) => element.center || (element.lat && element.lon))
      .map((element) => this.processElement(element))
  }

  /**
   * Removes duplicate elements based on their ID
   */
  private removeDuplicates(elements: OverpassElement[]): OverpassElement[] {
    return Object.values(
      elements.reduce<Record<string, OverpassElement>>((acc, element) => {
        if (!element.id) return acc

        const id = String(element.id)
        const existing = acc[id]
        const newTagCount = Object.keys(element.tags || {}).length

        if (
          !existing ||
          newTagCount > Object.keys(existing.tags || {}).length
        ) {
          acc[id] = element
        }

        return acc
      }, {}),
    )
  }

  /**
   * Transforms a single Overpass element into a LandmarkDto
   */
  private processElement(element: OverpassElement): LandmarkDto {
    const tags = element.tags || {}
    const center = {
      lat: element.center?.lat || element.lat!,
      lng: element.center?.lon || element.lon!,
    }

    const moreInfo = this.createOptionalFields(tags)

    return {
      name: tags[OVERPASS_TAGS.NAME] || 'Unnamed Landmark',
      type: this.determineType(tags),
      center,
      ...(this.checkAddressExist(tags) && { address: this.buildAddress(tags) }),
      ...(moreInfo && { moreInfo }),
    }
  }

  private checkAddressExist(tags: Record<string, string>): boolean {
    return Boolean(
      tags[OVERPASS_ADDRESS_TAGS.STREET] ||
        tags[OVERPASS_ADDRESS_TAGS.HOUSE_NUMBER] ||
        tags[OVERPASS_ADDRESS_TAGS.CITY] ||
        tags[OVERPASS_ADDRESS_TAGS.POSTCODE],
    )
  }

  /**
   * Creates optional fields for the landmark
   */
  private createOptionalFields(
    tags: Record<string, string>,
  ): Partial<MoreInfoDto> {
    // Create an object with all potential fields
    const optionalFields: Partial<MoreInfoDto> = {
      ...((tags[OVERPASS_TAGS.WIKIPEDIA] || tags[OVERPASS_TAGS.WIKIDATA]) && {
        wiki: this.buildWikiUrl(tags),
      }),
      ...(tags[OVERPASS_TAGS.WEBSITE] && {
        website: tags[OVERPASS_TAGS.WEBSITE],
      }),
      ...(tags[OVERPASS_TAGS.OPENING_HOURS] && {
        openingHours: tags[OVERPASS_TAGS.OPENING_HOURS],
      }),
      ...(tags[OVERPASS_TAGS.WHEELCHAIR] && {
        accessibility: tags[OVERPASS_TAGS.WHEELCHAIR],
      }),
      ...(tags[OVERPASS_TAGS.TOURISM] && {
        tourism: tags[OVERPASS_TAGS.TOURISM],
      }),
    }

    return optionalFields
  }

  /**
   * Determines the type of landmark
   */
  private determineType(tags: Record<string, string>): string {
    // Find the first matching type key in our hierarchy
    const typeKey = OVERPASS_TYPE_HIERARCHY.find((key) => Boolean(tags[key]))
    return typeKey ? tags[typeKey] : DEFAULT_LANDMARK_TYPE
  }

  /**
   * Builds an address string from address tags
   */
  private buildAddress(tags: Record<string, string>): string | undefined {
    const { STREET, HOUSE_NUMBER, CITY, POSTCODE } = OVERPASS_ADDRESS_TAGS

    // Create array of address components
    const addressParts = [
      // Street with house number if available
      tags[STREET] && `${tags[STREET]} ${tags[HOUSE_NUMBER] || ''}`.trim(),
      // City if available
      tags[CITY],
      // Postcode if available
      tags[POSTCODE],
    ].filter(Boolean) // Filter out any undefined/empty values

    return addressParts.length > 0 ? addressParts.join(', ') : undefined
  }

  /**
   * Builds more info URL string from tags
   */
  private buildWikiUrl(tags: Record<string, string>): string | undefined {
    if (tags[OVERPASS_TAGS.WIKIPEDIA]) {
      const [lang, article] = tags[OVERPASS_TAGS.WIKIPEDIA].split(':')
      return `https://${lang}.wikipedia.org/wiki/${article}`
    }

    if (tags[OVERPASS_TAGS.WIKIDATA]) {
      return `https://www.wikidata.org/wiki/${tags[OVERPASS_TAGS.WIKIDATA]}`
    }

    return undefined
  }
}
