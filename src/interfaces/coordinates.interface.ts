export interface QueryCoordinatesString {
  lat: string
  lng: string
}

export interface QueryCoordinates {
  lat: number
  lng: number
}

export interface BodyCoordinates {
  lat: number
  lng: number
  radius?: number
}

export type Coordinates = QueryCoordinates | BodyCoordinates
