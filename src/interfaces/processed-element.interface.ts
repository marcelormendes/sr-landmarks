export interface ProcessedElement {
  name: string
  type: string
  center: {
    lat: number
    lng: number
  }
  address?: string
  moreInfo?: {
    wiki?: string
    website?: string
    openingHours?: string
    accessibility?: string
    tourism?: string
  }
}
