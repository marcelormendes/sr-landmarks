import { z } from 'zod'

// Base coordinate validation for numbers
export const CoordinateNumberSchema = {
  lat: z
    .number()
    .min(-90, 'Latitude must be greater than or equal to -90')
    .max(90, 'Latitude must be less than or equal to 90')
    .refine((val) => !isNaN(val), 'Latitude must be a valid number'),
  lng: z
    .number()
    .min(-180, 'Longitude must be greater than or equal to -180')
    .max(180, 'Longitude must be less than or equal to 180')
    .refine((val) => !isNaN(val), 'Longitude must be a valid number'),
  radius: z
    .number()
    .min(100, 'Radius must be greater than or equal to 100 meters')
    .max(10000, 'Radius must be less than or equal to 10000 meters')
    .optional()
    .default(500),
}

// For query parameters (string input)
export const LandmarksSchema = z
  .object({
    lat: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(CoordinateNumberSchema.lat),
    lng: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(CoordinateNumberSchema.lng),
  })
  .describe('coordinate-query-schema')

// Define the location schema
export const LandmarkLocationSchemaDto = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const moreInfoSchemaDto = z.object({
  wikipedia: z.string().optional(),
  website: z.string().optional(),
  openingHours: z.string().optional(),
  accessibility: z.string().optional(),
  tourism: z.string().optional(),
})

// Define the landmark schema
export const LandmarkSchemaDto = z.object({
  name: z.string(),
  type: z.string(),
  center: LandmarkLocationSchemaDto,
  address: z.string().optional(),
  moreInfo: moreInfoSchemaDto.optional(),
})

export type LandmarkLocation = z.infer<typeof LandmarksSchema>
