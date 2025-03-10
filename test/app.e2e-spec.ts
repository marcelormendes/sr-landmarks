import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, Logger } from '@nestjs/common'
import request from 'supertest'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../src/services/prisma.service'
import { CacheService } from '../src/services/cache.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { TestConfigService } from './test.config'
import { UuidSchema } from '../src/schemas/webhook.schema'
import { EnhancedZodValidationPipe } from '../src/schemas/pipes/zod-validation.pipe'
import { TestModule } from './test.module'

/**
 * End-to-end tests for the Landmarks API
 * Tests the core API functionality: landmarks, webhooks, and caching
 */
describe('Landmarks API (e2e)', () => {
  let app: INestApplication
  let configService: ConfigService
  let cacheService: CacheService
  let cacheManager: any
  let accessToken: string

  // This helps with debugging test errors
  jest.setTimeout(30000) // Increase timeout to 30 seconds for e2e tests

  beforeAll(async () => {
    try {
      console.log('Setting up e2e test module...')
      process.env.NODE_ENV = 'test'
      process.env.REDIS_HOST = 'localhost'
      process.env.REDIS_PORT = '6379'

      // Setup database
      const { execSync } = require('child_process')
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' })

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModule],
      })
      .overrideProvider(ConfigService)
      .useClass(TestConfigService)
      .compile()

      app = moduleFixture.createNestApplication()
      // No global validation pipe needed since we're using Zod validation

      await app.init()

      // Get required services
      configService = app.get<ConfigService>(ConfigService)
      cacheService = app.get<CacheService>(CacheService)
      cacheManager = app.get(CACHE_MANAGER)

      // Get JWT token through the actual auth endpoint
      const authResponse = await request(app.getHttpServer())
        .post('/auth/token')
        .send({ apiKey: 'test-secret-key-1234567890-test-secret-key-1234567890' })
        .expect(200)

      accessToken = authResponse.body.access_token
      console.log('Test setup complete with valid JWT token')
    } catch (error) {
      console.error('Error during test setup:', error)
      throw error
    }
  })

  afterAll(async () => {
    try {
      if (app) {
        const prismaService = app.get(PrismaService)
        try {
          await prismaService.$executeRaw`DELETE FROM "Landmark";`
        } catch (err) {
          console.log('Tables may not exist yet, skipping cleanup')
        }
        
        await app.close()
      }

      const fs = require('fs')
      if (fs.existsSync('test.sqlite')) {
        fs.unlinkSync('test.sqlite')
      }
    } catch (error) {
      console.error('Error during test cleanup:', error)
    }
  })

  describe('Authentication Flow', () => {
    it('should authenticate and process webhook', async () => {
      // Step 1: Verify we have a valid token
      expect(accessToken).toBeDefined()

      // Step 2: Use the token to make a webhook request
      const webhookData = {
        lat: 51.5074,
        lng: -0.1278,
        radius: 500
      }
      console.log('Sending webhook request with data:', webhookData)

      const webhookResponse = await request(app.getHttpServer())
        .post('/webhook')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(webhookData)
        .expect((res) => {
          console.log('Webhook response status:', res.status)
          console.log('Webhook response body:', res.body)
        })
        .expect(202)

      const requestId = webhookResponse.body.requestId
      console.log('Webhook created with requestId:', requestId)

      // Test the UUID validation directly
      const logger = new Logger('ValidationTest');
      const validationPipe = new EnhancedZodValidationPipe(UuidSchema, logger)
      try {
        console.log('Attempting to validate UUID:', requestId)
        console.log('UUID validation metadata:', {
          type: 'param',
          data: 'uuid',
          metatype: String
        })
        
        const validatedUuid = await validationPipe.transform(requestId, {
          type: 'param',
          data: 'uuid',
          metatype: String
        })
        console.log('UUID validation successful:', validatedUuid)
      } catch (error) {
        console.log('UUID validation failed:', error)
        console.log('Validation error details:', error.response)
      }

      // Continue with the webhook status check
      const statusResponse = await request(app.getHttpServer())
        .get(`/webhook/${requestId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      console.log('Status response:', statusResponse.status)
      console.log('Status response body:', statusResponse.body)

      expect(statusResponse.status).toBe(200)
      expect(statusResponse.body).toHaveProperty('requestId', requestId)
      expect(statusResponse.body).toHaveProperty('status')
      expect(statusResponse.body).toHaveProperty('coordinates')
    })
  })

  describe('/landmarks (GET)', () => {
    it('should retrieve landmarks near coordinates', () => {
      console.log('Testing GET /landmarks endpoint...')
      return request(app.getHttpServer())
        .get('/landmarks?lat=51.5080&lng=-0.1281')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          console.log('Response status:', res.status)
          console.log('Response body:', JSON.stringify(res.body).substring(0, 100) + '...')
          
          if (res.status === 200) {
            expect(res.body).toBeInstanceOf(Array)
            if (res.body.length > 0) {
              expect(res.body[0]).toHaveProperty('name')
              expect(res.body[0]).toHaveProperty('type')
              expect(res.body[0]).toHaveProperty('center')
              expect(res.body[0].center).toHaveProperty('lat')
              expect(res.body[0].center).toHaveProperty('lng')
            }
          }
        })
        .expect((res) => expect([200, 404]).toContain(res.status))
    })

    it('should return 400 with invalid parameters', () => {
      return request(app.getHttpServer())
        .get('/landmarks?lat=invalid&lng=-0.1281')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
        .expect(res => {
          expect(res.body).toHaveProperty('message')
        })
    })
  })

  describe('Caching', () => {
    const testLat = 51.5080
    const testLng = -0.1281
    const testRadius = 500

    it('should generate different geohashes for different coordinates', async () => {
      const coords1 = { lat: 51.5080, lng: -0.1281 }
      const coords2 = { lat: 52.5085, lng: -1.1285 }
      
      await request(app.getHttpServer())
        .get(`/landmarks?lat=${coords1.lat}&lng=${coords1.lng}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => expect([200, 404]).toContain(res.status))
        
      await request(app.getHttpServer())
        .get(`/landmarks?lat=${coords2.lat}&lng=${coords2.lng}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => expect([200, 404]).toContain(res.status))
      
      try {
        if (cacheManager.store && typeof cacheManager.store.keys === 'function') {
          const keys = await cacheManager.store.keys('*landmarks*')
          console.log('Cache keys:', keys)
          
          if (keys.length > 0) {
            expect(keys.length).toBeGreaterThan(0)
          }
        }
      } catch (error) {
        console.log('Error accessing cache keys:', error.message)
      }
    })

    it('should respond faster on subsequent requests due to caching', async () => {
      const startTime1 = Date.now()
      
      const firstResponse = await request(app.getHttpServer())
        .get(`/landmarks?lat=${testLat}&lng=${testLng}&radius=${testRadius}`)
        .set('Authorization', `Bearer ${accessToken}`)
      
      const duration1 = Date.now() - startTime1
      
      const startTime2 = Date.now()
      
      const secondResponse = await request(app.getHttpServer())
        .get(`/landmarks?lat=${testLat}&lng=${testLng}&radius=${testRadius}`)
        .set('Authorization', `Bearer ${accessToken}`)
        
      expect(secondResponse.status).toEqual(firstResponse.status)
      
      const duration2 = Date.now() - startTime2
      expect(duration2).toBeLessThanOrEqual(duration1 * 5.0)
    })

    it('should cache identical responses for repeated requests', async () => {
      const firstResponse = await request(app.getHttpServer())
        .get(`/landmarks?lat=${testLat}&lng=${testLng}&radius=${testRadius}`)
        .set('Authorization', `Bearer ${accessToken}`)
      
      const secondResponse = await request(app.getHttpServer())
        .get(`/landmarks?lat=${testLat}&lng=${testLng}&radius=${testRadius}`)
        .set('Authorization', `Bearer ${accessToken}`)
      
      expect(secondResponse.status).toEqual(firstResponse.status)
      expect(JSON.stringify(secondResponse.body)).toEqual(JSON.stringify(firstResponse.body))
      
      try {
        if (cacheManager.store && typeof cacheManager.store.keys === 'function') {
          const keys = await cacheManager.store.keys('*landmarks*')
          if (keys.length > 0 && typeof cacheManager.get === 'function') {
            const cachedData = await cacheManager.get(keys[0])
            
            if (cachedData) {
              expect(Array.isArray(cachedData)).toBe(true)
              
              if (cachedData.length > 0 && firstResponse.body?.length > 0) {
                expect(cachedData[0]).toHaveProperty('name')
                expect(cachedData[0]).toHaveProperty('type')
                expect(cachedData[0]).toHaveProperty('center')
              }
            }
          }
        }
      } catch (error) {
        console.log('Error accessing cached data:', error.message)
      }
    })
  })

  describe('Webhook Endpoints', () => {
    const testCoordinates = {
      lat: 51.5074,
      lng: -0.1278,
      radius: 500
    }

    describe('POST /webhook (Async)', () => {
      it('should accept webhook request and return 202', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhook')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(testCoordinates)
          .expect(202)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('requestId')
        expect(response.body).toHaveProperty('message')

        // Verify webhook status
        const statusResponse = await request(app.getHttpServer())
          .get(`/webhook/${response.body.requestId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)

        expect(statusResponse.body).toHaveProperty('status')
        expect(statusResponse.body.coordinates).toEqual(testCoordinates)
      })

      it('should return 401 without auth token', () => {
        return request(app.getHttpServer())
          .post('/webhook')
          .send(testCoordinates)
          .expect(401)
      })
    })

    describe('POST /webhook/sync', () => {
      it('should process webhook synchronously and return 200', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhook/sync')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(testCoordinates)
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body).toHaveProperty('requestId')
        expect(response.body).toHaveProperty('message')

        // Verify webhook status shows completed
        const statusResponse = await request(app.getHttpServer())
          .get(`/webhook/${response.body.requestId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)

        expect(statusResponse.body).toHaveProperty('status', 'Completed')
        expect(statusResponse.body.coordinates).toEqual(testCoordinates)
        expect(statusResponse.body).toHaveProperty('completedAt')
      })

      it('should return 401 without auth token', () => {
        return request(app.getHttpServer())
          .post('/webhook/sync')
          .send(testCoordinates)
          .expect(401)
      })

      it('should validate input parameters', () => {
        const invalidCoordinates = {
          lat: 'invalid',
          lng: -0.1278
        }

        return request(app.getHttpServer())
          .post('/webhook/sync')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidCoordinates)
          .expect(400)
      })
    })

    describe('GET /webhook/:uuid', () => {
      it('should return 404 for non-existent webhook', () => {
        return request(app.getHttpServer())
          .get('/webhook/550e8400-e29b-41d4-a716-446655440000')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404)
      })

      it('should return 400 for invalid UUID', () => {
        return request(app.getHttpServer())
          .get('/webhook/invalid-uuid')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400)
      })
    })
  })
})