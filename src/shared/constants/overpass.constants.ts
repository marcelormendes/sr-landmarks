export const OVERPASS_TYPE_HIERARCHY = [
  'tourism',
  'leisure',
  'amenity',
  'historic',
  'building',
  'place',
  'natural',
  'highway',
] as const

export const OVERPASS_ADDRESS_TAGS = {
  STREET: 'addr:street',
  HOUSE_NUMBER: 'addr:housenumber',
  CITY: 'addr:city',
  POSTCODE: 'addr:postcode',
} as const

export const OVERPASS_TAGS = {
  ...OVERPASS_ADDRESS_TAGS,
  WIKIPEDIA: 'wikipedia',
  WIKIDATA: 'wikidata',
  WEBSITE: 'website',
  OPENING_HOURS: 'opening_hours',
  WHEELCHAIR: 'wheelchair',
  TOURISM: 'tourism',
  NAME: 'name',
} as const

export const OVERPASS_ELEMENT_TYPES = ['node', 'way', 'relation'] as const

export const DEFAULT_LANDMARK_TYPE = 'attraction'
