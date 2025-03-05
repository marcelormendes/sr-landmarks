import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ApiProperty } from '@nestjs/swagger'

// Define the location schema
export const LandmarkLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

// Define the landmark schema
export const LandmarkSchema = z.object({
  name: z.string(),
  type: z.string(),
  center: LandmarkLocationSchema,
})

// Create DTOs from the schemas
export class LandmarkLocationDto extends createZodDto(LandmarkLocationSchema) {
  @ApiProperty({
    description: 'Latitude in decimal degrees',
    example: 40.7484,
  })
  lat: number

  @ApiProperty({
    description: 'Longitude in decimal degrees',
    example: -73.9857,
  })
  lng: number
}

export class LandmarkDto extends createZodDto(LandmarkSchema) {
  @ApiProperty({
    description: 'Name of the landmark',
    example: 'Empire State Building',
  })
  name: string

  @ApiProperty({
    description: 'Type of landmark',
    example: 'attraction',
    enum: ['attraction', 'monument', 'building', 'park', 'natural', 'museum'],
  })
  type: string

  @ApiProperty({
    description: 'Center coordinates of the landmark',
    type: LandmarkLocationDto,
  })
  center: LandmarkLocationDto
}
