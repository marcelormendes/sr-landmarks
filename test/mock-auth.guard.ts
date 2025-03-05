import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

/**
 * Mock implementation of the AuthGuard for testing
 * Simply returns true for all requests
 */
@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true
  }
}