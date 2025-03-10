import { z } from 'zod'

// Define schema for environment validation
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3000'),
  DATABASE_FILE: z.string().default('landmarks.sqlite'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('6379'),
  REDIS_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3600'),
  JWT_SECRET: z.union([
    z.string().min(16),
    z.literal(undefined),
    z.literal(''),
  ]),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  OVERPASS_URL: z
    .string()
    .url()
    .default('https://overpass-api.de/api/interpreter'),
  OVERPASS_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('30000'),
  OVERPASS_MAX_RETRIES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3'),
  API_SYNC_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('60000'),
  WORKER_LOCK_DURATION: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('30000'),
  WORKER_STALLED_INTERVAL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('15000'),
  WORKER_MAX_STALLED_COUNT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3'),
})
