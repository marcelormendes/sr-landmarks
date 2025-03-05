import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { createTestSafeLogger } from '../../utils/test-utils'
import {
  BEARER_AUTH_TYPE,
  AUTH_ERROR_MESSAGES,
  IS_PUBLIC_KEY,
  JWT_CONSTANTS,
} from '../../constants/auth.constants'

// Define a custom interface to extend Express Request with user property
interface RequestWithUser extends Request {
  user: Record<string, unknown>
}

/**
 * Guard that validates API access tokens using JWT
 * Provides token validation and expiration checking
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = createTestSafeLogger(AuthGuard.name)
  private readonly jwtSecret: string

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {
    this.jwtSecret =
      this.configService.get<string>('auth.secret') || JWT_CONSTANTS.secret
  }

  /**
   * Validates if the request is authorized
   * Applies JWT token validation
   *
   * @param context - The execution context
   * @returns True if the request is authorized
   * @throws UnauthorizedException if the token is invalid or missing
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.MISSING_AUTH_HEADER)
    }

    // Verify JWT token
    try {
      // Verify the JWT token and get the payload
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(token, {
        secret: this.jwtSecret,
      })

      // Attach the user payload to the request object using our custom interface
      // so it can be accessed in route handlers
      ;(request as RequestWithUser).user = payload

      return true
    } catch (error) {
      this.logger.warn(
        `JWT validation failed - Error: ${error instanceof Error ? error.message : String(error)}`,
      )

      // Handle specific JWT errors
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED)
      }

      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID)
    }
  }

  /**
   * Extracts the bearer token from the request header
   *
   * @param request - The HTTP request
   * @returns The token string or undefined
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === BEARER_AUTH_TYPE ? token : undefined
  }
}
