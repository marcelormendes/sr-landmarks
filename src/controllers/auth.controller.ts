import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from '../services/auth/auth.service'
import { Public } from '../decorators/public.decorator'
import { ApiKey, authSchema } from '../schemas/auth.schema'
import { TokenResponseDto } from '../dto/auth.dto'
import { EnhancedZodValidationPipe } from '../schemas/pipes/zod-validation.pipe'
import { BEARER, ONE_HOUR } from '../constants/auth.constants'
import { AuthUnAuthorizedException } from '../exceptions/api.exceptions'
import { ErrorHandler } from '../exceptions/error-handling'
/**
 * Controller for authentication endpoints
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private authService: AuthService) {}

  /**
   * Exchange API key for JWT token
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange API key for JWT token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'JWT token generated successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid API key',
  })
  async getToken(
    @Body(
      new EnhancedZodValidationPipe(authSchema, new Logger('AuthValidation')),
    )
    body: ApiKey,
  ): Promise<TokenResponseDto> {
    try {
      if (!body.apiKey) {
        throw new AuthUnAuthorizedException(
          'API key is required',
          HttpStatus.BAD_REQUEST,
        )
      }

      const token = await this.authService.generateToken(body.apiKey)

      return {
        access_token: token,
        expires_in: ONE_HOUR,
        token_type: BEARER,
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, AuthUnAuthorizedException, {
        context: 'Auth controller',
        logger: this.logger,
      })
    }
  }
}
