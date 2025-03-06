import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JWT_CONSTANTS } from '../constants/auth.constants'

describe('AuthService', () => {
  let service: AuthService
  let jwtService: JwtService
  let configService: ConfigService
  
  const TEST_SECRET = 'test-secret-key'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'jwt.secret') return TEST_SECRET
              return undefined
            }),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jwtService = module.get<JwtService>(JwtService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validateApiKey', () => {
    it('should return true for valid API key', () => {
      expect(service.validateApiKey(TEST_SECRET)).toBe(true)
    })

    it('should return false for invalid API key', () => {
      expect(service.validateApiKey('invalid-key')).toBe(false)
    })

    it('should return false for empty API key', () => {
      expect(service.validateApiKey('')).toBe(false)
    })

    it('should return false for undefined API key', () => {
      expect(service.validateApiKey(undefined as unknown as string)).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate a token for valid API key', async () => {
      const mockToken = 'mock-jwt-token'
      jwtService.signAsync = jest.fn().mockResolvedValue(mockToken)

      const result = await service.generateToken(TEST_SECRET)

      expect(result).toBe(mockToken)
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'api-client',
          apiKey: expect.any(String),
        }),
      )
    })

    it('should throw UnauthorizedException for invalid API key', async () => {
      await expect(service.generateToken('invalid-key')).rejects.toThrow(
        UnauthorizedException,
      )
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('should store only a partial API key in the token', async () => {
      const longApiKey = 'very-long-api-key-that-should-be-truncated'
      const mockToken = 'mock-jwt-token'
      
      // Override config service to return our test key
      configService.get = jest.fn().mockReturnValue(longApiKey)
      
      // Create a new service instance with the updated config
      service = new AuthService(jwtService, configService)
      
      jwtService.signAsync = jest.fn().mockResolvedValue(mockToken)

      await service.generateToken(longApiKey)

      // Check that a truncated version of the key was used
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'api-client',
          apiKey: expect.stringMatching(/^.{1,8}\.\.\.$/)
        }),
      )
    })
  })

  describe('verifyToken', () => {
    it('should return payload for valid token', async () => {
      const mockPayload = { sub: 'api-client', apiKey: 'test...', iat: 123, exp: 456 }
      jwtService.verifyAsync = jest.fn().mockResolvedValue(mockPayload)

      const result = await service.verifyToken('valid-token')

      expect(result).toEqual(mockPayload)
      // Update to match the actual secret used in the service
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({
          secret: service['apiSecret'],
        }),
      )
    })

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verifyAsync = jest.fn().mockRejectedValue(new Error('Invalid token'))

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })
})