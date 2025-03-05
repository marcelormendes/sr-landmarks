import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { JWT_CONSTANTS } from '../constants/auth.constants'

/**
 * Payload for JWT tokens
 */
export interface JwtPayload {
  sub: string
  apiKey: string
  iat?: number
  exp?: number
}

/**
 * Service for handling authentication and JWT token operations
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private apiSecret: string

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.apiSecret =
      this.configService.get<string>('jwt.secret') || JWT_CONSTANTS.secret
  }

  /**
   * Validates API key against configured secret
   * @param apiKey - API key to validate
   * @returns True if valid
   */
  validateApiKey(apiKey: string): boolean {
    if (!apiKey) {
      return false
    }

    return apiKey === this.apiSecret
  }

  /**
   * Generate a JWT token for an API client
   * @param apiKey - The API key to include in the token
   * @returns JWT token
   */
  async generateToken(apiKey: string): Promise<string> {
    if (!this.validateApiKey(apiKey)) {
      this.logger.warn(`Token generation attempt with invalid API key`)
      throw new UnauthorizedException('Invalid API key')
    }

    const payload: JwtPayload = {
      sub: 'api-client',
      apiKey: apiKey.substring(0, 8) + '...', // Only store partial key in token
    }

    return this.jwtService.signAsync(payload)
  }

  /**
   * Verify a JWT token
   * @param token - JWT token to verify
   * @returns JWT payload if valid
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.apiSecret,
      })
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw new UnauthorizedException('Invalid token')
    }
  }
}
