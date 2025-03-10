import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from '../services/auth/auth.service'
import { AuthUnAuthorizedException } from '../exceptions/api.exceptions'
import { HttpStatus } from '@nestjs/common'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  beforeEach(async () => {
    const mockAuthService = {
      generateToken: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getToken', () => {
    it('should return a token when valid API key is provided', async () => {
      const apiKey = 'valid-api-key'
      const token = 'jwt-token-123'
      const expiresIn = 3600

      authService.generateToken = jest.fn().mockResolvedValue(token)

      const result = await controller.getToken({ apiKey })

      expect(result).toEqual({
        access_token: token,
        expires_in: expiresIn,
        token_type: 'Bearer',
      })
      expect(authService.generateToken).toHaveBeenCalledWith(apiKey)
    })

    it('should throw UnauthorizedException when no API key is provided', async () => {
      await expect(controller.getToken({ apiKey: '' })).rejects.toThrow(
        AuthUnAuthorizedException,
      )
      expect(authService.generateToken).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException when auth service rejects', async () => {
      const apiKey = 'invalid-api-key'

      authService.generateToken = jest
        .fn()
        .mockRejectedValue(new AuthUnAuthorizedException('Invalid API key', HttpStatus.UNAUTHORIZED))

      await expect(controller.getToken({ apiKey })).rejects.toThrow(
        AuthUnAuthorizedException,
      )
      expect(authService.generateToken).toHaveBeenCalledWith(apiKey)
    })
  })
})