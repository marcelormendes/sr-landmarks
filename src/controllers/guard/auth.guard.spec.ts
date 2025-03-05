import { Test, TestingModule } from '@nestjs/testing'
import { AuthGuard } from './auth.guard'
import { ConfigService } from '@nestjs/config'
import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common'
import { BEARER_AUTH_TYPE } from '../../constants/auth.constants'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

// Create a mock logger that doesn't log during tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
}

/**
 * Mock implementation of execution context for testing
 */
const mockExecutionContext = (headers = {}, ip = '127.0.0.1', isPublic = false) => {
  const mockContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        headers,
        socket: {
          remoteAddress: ip
        }
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext
  
  return mockContext
}

describe('AuthGuard', () => {
  let guard: AuthGuard
  let configService: ConfigService
  let jwtService: JwtService
  let reflector: Reflector
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'auth.secret') return 'test-secret-key'
              return null
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          }
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn()
          }
        },
        {
          provide: Logger,
          useValue: mockLogger
        }
      ],
    }).compile()
    
    guard = module.get<AuthGuard>(AuthGuard)
    configService = module.get<ConfigService>(ConfigService)
    jwtService = module.get<JwtService>(JwtService)
    reflector = module.get<Reflector>(Reflector)
  })
  
  it('should be defined', () => {
    expect(guard).toBeDefined()
  })

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      const context = mockExecutionContext({})
      
      // Mock route as public
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true)
      
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
      
      // JWT verification should not be called for public routes
      expect(jwtService.verifyAsync).not.toHaveBeenCalled()
    })
    
    it('should reject missing authorization header', async () => {
      const context = mockExecutionContext({})
      
      // Mock route as protected
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false)
      
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
    })
    
    it('should reject invalid authorization type', async () => {
      const context = mockExecutionContext({
        authorization: 'Basic invalid-token' // Not using BEARER_AUTH_TYPE
      })
      
      // Mock route as protected
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false)
      
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
      expect(jwtService.verifyAsync).not.toHaveBeenCalled()
    })
    
    it('should reject invalid JWT token', async () => {
      const context = mockExecutionContext({
        authorization: `${BEARER_AUTH_TYPE} invalid-jwt-token`
      })
      
      // Mock route as protected
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false)
      
      // Mock JWT verification to fail
      jwtService.verifyAsync = jest.fn().mockRejectedValue(new Error('Invalid token'))
      
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-jwt-token', expect.any(Object))
    })
    
    it('should allow requests with valid JWT tokens', async () => {
      const token = 'valid-jwt-token'
      const payload = { sub: 'user-123', apiKey: 'xxx...' }
      const request = { 
        headers: { authorization: `${BEARER_AUTH_TYPE} ${token}` }, 
        socket: { remoteAddress: '127.0.0.1' },
        user: null 
      }
      
      const context = mockExecutionContext(request.headers)
      const getRequest = context.switchToHttp().getRequest as jest.Mock
      getRequest.mockReturnValue(request)
      
      // Mock route as protected
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false)
      
      // Mock JWT verification to succeed
      jwtService.verifyAsync = jest.fn().mockResolvedValue(payload)
      
      const result = await guard.canActivate(context)
      
      expect(result).toBe(true)
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, expect.any(Object))
      expect(request.user).toEqual(payload)
    })
    
    it('should handle token expiration specifically', async () => {
      const context = mockExecutionContext({
        authorization: `${BEARER_AUTH_TYPE} expired-token`
      })
      
      // Mock route as protected
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false)
      
      // Create an error with the TokenExpiredError name
      const expiredError = new Error('Token expired')
      expiredError.name = 'TokenExpiredError'
      
      // Mock JWT verification to fail with expiration
      jwtService.verifyAsync = jest.fn().mockRejectedValue(expiredError)
      
      // Should throw with specific message
      try {
        await guard.canActivate(context)
        fail('Should have thrown UnauthorizedException')
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException)
        expect(error.message).toContain('expired')
      }
    })
  })
})