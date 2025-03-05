import { z } from 'zod'
import { QueryCoordinateSchema } from './coordinate-validation.schema'

export const LandmarksSchema = QueryCoordinateSchema
export type LandmarkLocation = z.infer<typeof LandmarksSchema>
