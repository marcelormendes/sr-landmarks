import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { ApiProperty } from '@nestjs/swagger'

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

// Create DTOs from the schemas
export class LandmarkLocationDto extends createZodDto(
  LandmarkLocationSchemaDto,
) {
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

export class MoreInfoDto extends createZodDto(moreInfoSchemaDto) {
  @ApiProperty({
    description: 'Wikipedia URL',
    example: 'https://en.wikipedia.org/wiki/Empire_State_Building',
    required: false,
  })
  wiki?: string

  @ApiProperty({
    description: 'Website URL',
    example: 'https://www.empirestatebuilding.com',
    required: false,
  })
  website?: string

  @ApiProperty({
    description: 'Opening hours',
    example: 'Mo-Su 09:00-17:00',
    required: false,
  })
  openingHours?: string

  @ApiProperty({
    description: 'Accessibility information',
    example: 'yes',
    required: false,
  })
  accessibility?: string

  @ApiProperty({
    description: 'Tourism information',
    example: 'yes',
    required: false,
  })
  tourism?: string
}

export class LandmarkDto extends createZodDto(LandmarkSchemaDto) {
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

  @ApiProperty({
    description: 'Address of the landmark',
    example: '123 Main St, New York, NY 10001',
    required: false,
  })
  address?: string

  @ApiProperty({
    description: 'More information about the landmark',
    type: MoreInfoDto,
    required: false,
  })
  moreInfo?: MoreInfoDto
}
