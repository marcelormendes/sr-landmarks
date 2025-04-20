/**
 * Interface for landmark processing jobs
 */
export interface LandmarkProcessingJob {
  lat: number
  lng: number
  radius: number
  requestId: string
  producerId?: string
  timestamp?: string
}
