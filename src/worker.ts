import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import * as os from 'os'
import { WorkerModule } from './modules/worker.module'
import { v4 } from 'uuid'

/**
 * Dedicated worker entry point
 * This file can be used to run standalone worker instances that only process queue jobs
 *
 * Example usage:
 * - In development: nest start -c nest-worker.json
 * - In production: node dist/worker.js
 */
async function bootstrap() {
  const logger = new Logger('Worker')

  const hostName = os.hostname()
  logger.log(`Starting worker on host: ${hostName}`)

  // Create a minimal NestJS application with only the worker-related modules
  const app = await NestFactory.create(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  })

  // Get worker instance ID from environment or generate one
  const workerId = process.env.WORKER_ID || `worker-${v4()}`
  logger.log(`Worker instance ID: ${workerId}`)

  // Log available CPUs for potential worker scaling
  logger.log(`Running on system with ${os.cpus().length} CPU cores`)

  // Start the application on a different port than the main API
  const port = process.env.WORKER_PORT || 3100
  await app.listen(port)

  logger.log(`Worker started successfully on port ${port}`)
  logger.log(`Health check available at: http://localhost:${port}/health/queue`)

  // Graceful shutdown handler
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')

    app
      .close()
      .then(() => {
        console.log('HTTP server closed')
        process.exit(0)
      })
      .catch((error) => {
        console.error(
          'Error during shutdown:',
          error instanceof Error ? error.message : 'Unknown error',
        )
        process.exit(1)
      })
  })
}

// Add void to indicate we're intentionally not waiting for bootstrap
void bootstrap().catch((err) => {
  const error = err as Error
  Logger.error(
    'Worker failed to start: An unexpected error occurred',
    error.stack,
  )
  process.exit(1)
})
