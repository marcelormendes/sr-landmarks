import { Injectable } from '@nestjs/common'

/**
 * Builder for constructing Overpass QL queries.
 * Creates queries to find landmarks near specified coordinates.
 */
@Injectable()
export class OverpassQueryBuilder {
  /**
   * Builds an Overpass QL query to find tourist attractions within a radius of coordinates
   */
  public buildQuery(lat: number, lng: number, radius: number): string {
    return `
      [out:json];
      (
        way["tourism"="attraction"](around:${radius},${lat},${lng});
        relation["tourism"="attraction"](around:${radius},${lat},${lng});
      );
      out center;
    `
  }
}
