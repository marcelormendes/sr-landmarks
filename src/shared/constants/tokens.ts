import { InjectionToken } from '@nestjs/common'

/**
 * Injection tokens used across the application
 */
export const REDIS_CLIENT: InjectionToken = Symbol('REDIS_CLIENT')
