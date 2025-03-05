import { ApiProperty } from '@nestjs/swagger'

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expires_in: number

  @ApiProperty({ description: 'Type of token', example: 'Bearer' })
  token_type: string
}
