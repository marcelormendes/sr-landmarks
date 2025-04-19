import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JWT_CONSTANTS } from '@shared/constants/auth.constants'
import { AuthService } from '@modules/auth/auth.service'
import { AuthController } from '@modules/auth/auth.controller'

/**
 * Auth module that configures JWT token management
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get('auth.secret') || JWT_CONSTANTS.secret,
        signOptions: {
          expiresIn:
            configService.get('auth.expiresIn') || JWT_CONSTANTS.expiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
