import { Cache } from 'cache-manager'
import { Redis } from 'ioredis'

// Define types for internal cache store structure
export interface RedisStore {
  client?: Redis
  getClient?: () => Redis
}

export interface CacheManagerWithStore extends Cache {
  store?: RedisStore
}
