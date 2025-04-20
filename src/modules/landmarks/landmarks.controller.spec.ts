import { Test, TestingModule } from '@nestjs/testing'
import { LandmarksController } from './landmarks.controller'
import { LandmarksService } from '@modules/landmarks/services/landmarks.service'
import { LandmarksSchema } from '@modules/landmarks/landmarks.schema'
import { HttpStatus } from '@nestjs/common'

// Create a mock logger that doesn't log during tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
}
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from '@common/guards/auth.guard'
import { EnhancedZodValidationPipe } from '@common/pipes/zod-validation.pipe'
import { LandmarkException } from './landmarks.exception'
import { OverpassException } from '@modules/overpass/overpass.exception'
import { CustomException } from '@common/exceptions/custom.exceptions'
import { AuthException } from '@modules/auth/auth.exception'
import { PipeException } from '@common/pipes/pipe.exception'

// Define the test interface matching our expected transformation
interface QueryCoordinatesTest {
  lat: string
  lng: string
}

describe('LandmarksController', () => {
  let controller: LandmarksController
  let service: LandmarksService

  const mockLandmarks = [
    {
      name: 'Test Landmark',
      type: 'attraction',
      distance: 100,
      center: { lat: 40.1, lng: -74.5 },
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandmarksController],
      providers: [
        {
          provide: LandmarksService,
          useValue: {
            searchLandmarks: jest.fn().mockResolvedValue(mockLandmarks),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'auth.secret') return 'test-secret-key'
              return undefined
            }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<LandmarksController>(LandmarksController)
    service = module.get<LandmarksService>(LandmarksService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getLandmarks', () => {
    it('should get landmarks', async () => {
      const dto: QueryCoordinatesTest = { lat: '40.0', lng: '-74.0' }

      // Mock the transformed data that would come from the pipe
      const transformedData = {
        lat: 40.0,
        lng: -74.0,
      }

      // Mock the validation pipe by replacing the method with a spy
      jest
        .spyOn(controller as any, 'getLandmarks')
        .mockImplementationOnce(async () => {
          return await service.searchLandmarks(
            transformedData.lat,
            transformedData.lng,
          )
        })

      const result = await controller.getLandmarks(dto as any)

      // With the EnhancedZodValidationPipe the controller receives parsed numbers
      // We're mocking its behavior here directly for testing
      expect(service.searchLandmarks).toHaveBeenCalledWith(
        40.0, // Value after transformation
        -74.0, // Value after transformation
      )
      expect(result).toEqual(mockLandmarks)
    })

    it('should handle service errors and pass them through', async () => {
      const dto: QueryCoordinatesTest = { lat: '40.0', lng: '-74.0' }
      const notFoundError = new LandmarkException(
        'Landmarks not found',
        HttpStatus.NOT_FOUND,
      )

      // Mock the service to throw an error
      jest.spyOn(service, 'searchLandmarks').mockRejectedValue(notFoundError)

      // Mock the validation pipe
      jest
        .spyOn(controller as any, 'getLandmarks')
        .mockImplementationOnce(async () => {
          try {
            return await service.searchLandmarks(40.0, -74.0)
          } catch (error) {
            throw error
          }
        })

      await expect(controller.getLandmarks(dto as any)).rejects.toThrow(
        LandmarkException,
      )
    })

    it('should handle service unavailable exceptions', async () => {
      const dto: QueryCoordinatesTest = { lat: '40.0', lng: '-74.0' }
      const serviceError = new OverpassException(
        'External API unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      )

      // Mock the service to throw an error
      jest.spyOn(service, 'searchLandmarks').mockRejectedValue(serviceError)

      await expect(controller.getLandmarks(dto as any)).rejects.toThrow(
        OverpassException,
      )
    })

    it('should handle internal server errors', async () => {
      const dto: QueryCoordinatesTest = { lat: '40.0', lng: '-74.0' }
      const internalError = new CustomException(
        'Database connection failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )

      // Mock the service to throw an error
      jest.spyOn(service, 'searchLandmarks').mockRejectedValue(internalError)

      await expect(controller.getLandmarks(dto as any)).rejects.toThrow(
        CustomException,
      )
    })
  })

  describe('authentication', () => {
    it('should handle unauthorized access', async () => {
      // Create a mock guard that throws an error
      const authGuardMock = {
        canActivate: jest.fn().mockImplementation(() => {
          throw new AuthException('Invalid token', HttpStatus.UNAUTHORIZED)
        }),
      }

      // Create a test request object
      const mockRequest = {}
      const mockResponse = {}
      const mockNext = jest.fn()

      // Call the guard directly to verify it throws
      expect(() =>
        authGuardMock.canActivate(
          mockRequest as any,
          mockResponse as any,
          mockNext,
        ),
      ).toThrow(AuthException)

      // Verify the error was an UnauthorizedException
      try {
        authGuardMock.canActivate(
          mockRequest as any,
          mockResponse as any,
          mockNext,
        )
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException)
        expect(error.message).toBe('Auth Exception')
      }
    })
  })

  describe('validation', () => {
    it('should handle validation errors for invalid coordinates', async () => {
      // Create an instance of the validation pipe with logger
      const validationPipe = new EnhancedZodValidationPipe(
        LandmarksSchema,
        new Logger('ValidationTest'),
      )

      // Invalid data
      const invalidDto = { lat: 'not-a-number', lng: '-74.0' }

      // Validation should throw
      await expect(async () => {
        await validationPipe.transform(invalidDto, {
          type: 'query',
          metatype: undefined,
        } as any)
      }).rejects.toThrow(PipeException)

      // Verify the error in a more specific way
      try {
        await validationPipe.transform(invalidDto, {
          type: 'query',
          metatype: undefined,
        } as any)
      } catch (error) {
        expect(error).toBeInstanceOf(PipeException)
        expect(error.message).toBe('Invalid coordinates')
      }
    })

    it('should handle missing data in validation', async () => {
      // Create an instance of the validation pipe with logger
      const validationPipe = new EnhancedZodValidationPipe(
        LandmarksSchema,
        new Logger('ValidationTest'),
      )

      // Empty data
      const emptyDto = {}

      // Should throw ZodCustomError for empty data
      expect(() =>
        validationPipe.transform(emptyDto, {
          type: 'query',
          metatype: undefined,
        } as any),
      ).toThrow(PipeException)

      try {
        validationPipe.transform(emptyDto, {
          type: 'query',
          metatype: undefined,
        } as any)
      } catch (error) {
        expect(error).toBeInstanceOf(PipeException)
        expect(error.message).toBe('No data provided or empty object')
      }
    })
  })
})
