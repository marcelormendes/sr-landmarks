import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from '@modules/auth/auth.controller'
import { AuthService } from '@modules/auth/auth.service'
import { HttpStatus } from '@nestjs/common'
import { AuthException } from './auth.exception'

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
        AuthException,
      )
      expect(authService.generateToken).not.toHaveBeenCalled()
    })

    it('should throw Invalid credentials when auth service rejects', async () => {
      const apiKey = 'invalid-api-key'

      authService.generateToken = jest
        .fn()
        .mockRejectedValue(new AuthException('SRA001', HttpStatus.UNAUTHORIZED))

      await expect(controller.getToken({ apiKey })).rejects.toThrow(
        new AuthException('SRA001', HttpStatus.UNAUTHORIZED),
      )
    })
  })
})
