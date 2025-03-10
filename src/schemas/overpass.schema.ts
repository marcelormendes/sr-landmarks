import { OVERPASS_ELEMENT_TYPES } from '../constants/overpass.constants'
import { z } from 'zod'

export const OverpassElementSchema = z.object({
  id: z.number(),
  tags: z.record(z.string()).optional(),
  center: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  type: z.enum(OVERPASS_ELEMENT_TYPES),
})

export const OverpassResponseSchema = z.object({
  elements: z.array(OverpassElementSchema),
})

export type OverpassElement = z.infer<typeof OverpassElementSchema>
export type OverpassResponse = z.infer<typeof OverpassResponseSchema>
