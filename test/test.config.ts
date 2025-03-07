import { ConfigService } from '@nestjs/config'

const TEST_JWT_SECRET = 'test-secret-key-1234567890-test-secret-key-1234567890'

export const testConfig = {
  env: 'test',
  port: 3001,
  database: {
    type: 'sqlite',
    database: 'test.sqlite',
    synchronize: true,
  },
  redis: {
    host: 'localhost',
    port: 6379,
    ttl: 3600,
  },
  jwt: {
    secret: TEST_JWT_SECRET,
    expiresIn: '1h'
  },
  auth: {
    secret: TEST_JWT_SECRET,
    expiresIn: '1h'
  },
  cors: {
    allowedOrigins: '*',
  },
  overpass: {
    url: 'https://overpass-api.de/api/interpreter',
    timeout: 30000,
    maxRetries: 3,
  },
}

export class TestConfigService extends ConfigService {
  constructor() {
    super()
  }

  get<T = any>(propertyPath: string): T {
    const parts = propertyPath.split('.')
    let value: any = testConfig
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined as T
      }
    }
    
    return value as T
  }
} 