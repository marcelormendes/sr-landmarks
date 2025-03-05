import { Logger } from '@nestjs/common'

/**
 * Mock logger that suppresses logs during tests
 * Use this in test files to avoid noise in test output
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
})

/**
 * Determines if the code is running in a test environment
 */
export const isTestEnvironment = (): boolean => {
  return (
    process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
  )
}

/**
 * Creates a logger that is silent during tests but logs normally in production
 * @param context The class or context name for the logger
 */
export const createTestSafeLogger = (context: string): Logger => {
  // Return a mock logger in test environment
  if (isTestEnvironment()) {
    // Create a standard logger but override its methods to do nothing
    const logger = new Logger(context)

    // Override the logger methods to be no-ops
    logger.error = jest.fn()
    logger.warn = jest.fn()
    logger.log = jest.fn()
    logger.debug = jest.fn()
    logger.verbose = jest.fn()

    return logger
  }

  // Return normal logger in non-test environments
  return new Logger(context)
}
