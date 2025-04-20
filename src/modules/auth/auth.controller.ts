import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from '@modules/auth/auth.service'
import { Public } from '@shared/decorators/public.decorator'
import { ApiKey, authSchema } from '@modules/auth/auth.schema'
import { TokenResponseDto } from '@modules/auth/auth.dto'
import { EnhancedZodValidationPipe } from '@common/pipes/zod-validation.pipe'
import { BEARER, ONE_HOUR } from '@shared/constants/auth.constants'
import { AuthException } from '@modules/auth/auth.exception'
/**
 * Controller for authentication endpoints
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
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
    if (!body.apiKey) {
      throw new AuthException('SRA003', HttpStatus.BAD_REQUEST)
    }

    const token = await this.authService.generateToken(body.apiKey)

    return {
      access_token: token,
      expires_in: ONE_HOUR,
      token_type: BEARER,
    }
  }
}
