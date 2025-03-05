import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from '../services/auth.service'
import { Public } from '../decorators/public.decorator'
import { ApiKey, authSchema } from '../schemas/auth.schema'
import { TokenResponseDto } from '../dto/auth.dto'
import { EnhancedZodValidationPipe } from '../schemas/pipes/zod-validation.pipe'
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
   * @param body - Request body containing API key
   * @returns JWT token response
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
    @Body(new EnhancedZodValidationPipe(authSchema)) body: ApiKey,
  ): Promise<TokenResponseDto> {
    try {
      if (!body.apiKey) {
        throw new UnauthorizedException('API key is required')
      }

      const token = await this.authService.generateToken(body.apiKey)

      return {
        access_token: token,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
      }
    } catch (error) {
      this.logger.warn(
        `Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw new UnauthorizedException('Invalid API key')
    }
  }
}
