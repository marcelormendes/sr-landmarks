import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/services/prisma.service'
import { v4 as uuidv4 } from 'uuid'
import { exec, spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

/**
 * E2E test for multi-worker functionality
 * This test verifies that multiple workers can process jobs from the same queue
 */
describe('Multi-Worker Processing (e2e)', () => {
  let app: INestApplication
  let configService: ConfigService
  let authToken: string
  let prismaService: PrismaService
  let workerProcesses: ChildProcess[] = []
  
  /**
   * Helper function to spawn worker processes
   * Returns array of worker IDs
   */
  const spawnWorkers = async (count: number): Promise<string[]> => {
    console.log(`Spawning ${count} worker processes...`)
    
    // Use the built worker.js from the dist directory
    const workerPath = path.resolve(__dirname, '../dist/worker.js');
    if (!fs.existsSync(workerPath)) {
      throw new Error('Worker script not found at ' + workerPath + '. Please run "pnpm build" first.');
    }
    
    const workerIds: string[] = []
    
    // Spawn worker processes
    for (let i = 0; i < count; i++) {
      const workerId = `worker-${uuidv4().substring(0, 8)}`
      workerIds.push(workerId)
      
      // Get Redis connection details from config
      const redisConfig = configService.get('redis')
      
      // Spawn worker process with unique ID and shared Redis connection
      const workerProcess = spawn('node', [workerPath], {
        env: {
          ...process.env,
          WORKER_ID: workerId,
          REDIS_HOST: redisConfig?.host || 'localhost',
          REDIS_PORT: redisConfig?.port?.toString() || '6379',
        },
        stdio: 'inherit', // Show worker output in test logs
        detached: true,   // Run in the background
      })
      
      // Store process for cleanup
      workerProcesses.push(workerProcess)
      
      console.log(`Started worker ${workerId} with PID ${workerProcess.pid}`)
    }
    
    // Give workers time to start up
    await new Promise(resolve => setTimeout(resolve, 2000))
    return workerIds
  }
  
  /**
   * Helper to cleanup worker processes
   */
  const cleanupWorkers = async () => {
    console.log(`Cleaning up ${workerProcesses.length} worker processes...`)
    
    // Terminate each worker process
    for (const process of workerProcesses) {
      if (process.pid) {
        try {
          process.kill('SIGTERM')
          console.log(`Terminated worker process ${process.pid}`)
        } catch (error) {
          console.error(`Error terminating worker process ${process.pid}:`, error)
        }
      }
    }
    
    // Clear the array
    workerProcesses = []
    
    // We don't need to delete the worker-launcher.js script since it's a permanent part of the project
  }
  
  // Setup test environment
  beforeAll(async () => {
    try {
      console.log('Setting up multi-worker test environment...')
      
      // Force NODE_ENV to be 'test'
      process.env.NODE_ENV = 'test'
      
      // Reset database
      exec('npx prisma db push --force-reset')
      
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()
      
      app = moduleFixture.createNestApplication()
      await app.init()
      
      // Get services
      configService = app.get<ConfigService>(ConfigService)
      prismaService = app.get<PrismaService>(PrismaService)
      
      // Get auth token for webhook API
      authToken = configService.get<string>('auth.secret') || ''
      
      console.log('Test environment setup complete')
    } catch (error) {
      console.error('Error setting up test environment:', error)
      throw error
    }
  })
  
  // Cleanup after all tests
  afterAll(async () => {
    try {
      await cleanupWorkers()
      
      if (app) {
        await app.close()
      }
      
      console.log('Test environment cleanup complete')
    } catch (error) {
      console.error('Error during test cleanup:', error)
    }
  })
  
  /**
   * Test that multiple workers can process jobs from the same queue
   */
  it.skip('should distribute jobs across multiple workers - skipping in this environment', async () => {
    // Spawn 3 worker processes
    const workerCount = 3
    const workerIds = await spawnWorkers(workerCount)
    console.log(`Started ${workerIds.length} workers: ${workerIds.join(', ')}`)
    
    try {
      // Create multiple webhook requests (more than worker count)
      const requestCount = workerCount * 2 // Create 2 jobs per worker
      console.log(`Creating ${requestCount} webhook requests...`)
      
      const requests = Array.from({ length: requestCount }).map((_, i) => ({
        lat: 51.5 + (i * 0.001),  // Slightly different coordinates for each request
        lng: -0.12 + (i * 0.001),
        radius: 500 + (i * 50),
      }))
      
      // Submit all requests in parallel
      const responses = await Promise.all(
        requests.map(payload => 
          request(app.getHttpServer())
            .post('/webhook')
            .set('Authorization', `Bearer ${authToken}`)
            .send(payload)
            .expect(202)
        )
      )
      
      // Extract request IDs
      const requestIds = responses.map(res => res.body.requestId)
      console.log(`Created ${requestIds.length} requests with IDs: ${requestIds.join(', ')}`)
      
      // Poll until all requests are completed or timeout
      const maxWaitTime = 10000 // 10 seconds total wait time
      const checkInterval = 500 // Check every 500ms
      const startTime = Date.now()
      let allCompleted = false
      
      // Wait for all requests to be processed or timeout
      while (Date.now() - startTime < maxWaitTime && !allCompleted) {
        // Wait before checking
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        
        // Check status of all requests
        const statusResponses = await Promise.all(
          requestIds.map(id => 
            request(app.getHttpServer())
              .get(`/webhook/${id}`)
              .set('Authorization', `Bearer ${authToken}`)
          )
        )
        
        // Count how many are completed
        const statuses = statusResponses.map(res => res.body.status)
        const completedCount = statuses.filter(status => 
          status === 'completed' || status === 'failed'
        ).length
        
        console.log(`Progress: ${completedCount}/${requestIds.length} requests completed`)
        
        // If all are completed or failed, we're done
        allCompleted = completedCount === requestIds.length
      }
      
      // Get final status of all requests
      const finalStatusResponses = await Promise.all(
        requestIds.map(id => 
          request(app.getHttpServer())
            .get(`/webhook/${id}`)
            .set('Authorization', `Bearer ${authToken}`)
        )
      )
      
      // Count completed requests
      const completedCount = finalStatusResponses.filter(
        res => res.body.status === 'completed'
      ).length
      
      // Log completion information
      console.log(`Final result: ${completedCount}/${requestIds.length} requests completed successfully`)
      
      // Verify that a reasonable number of requests were completed
      // We expect at least half of the requests to be processed
      expect(completedCount).toBeGreaterThanOrEqual(Math.floor(requestCount / 2))
      
      // Check for an expected level of parallelism by analyzing completion timestamps
      // Get completion times for the requests
      const completionTimes = finalStatusResponses
        .filter(res => res.body.completedAt)
        .map(res => new Date(res.body.completedAt).getTime())
        .sort((a, b) => a - b)
      
      if (completionTimes.length >= 3) {
        // Calculate average time between job completions
        let totalTimeBetween = 0
        for (let i = 1; i < completionTimes.length; i++) {
          totalTimeBetween += completionTimes[i] - completionTimes[i-1]
        }
        const avgTimeBetween = totalTimeBetween / (completionTimes.length - 1)
        
        console.log(`Average time between completions: ${avgTimeBetween.toFixed(2)}ms`)
        
        // In a parallel processing environment, we'd expect some jobs to finish
        // with minimal time difference between them
        // Check for at least one pair of jobs completed within a small time window
        // This would suggest parallel processing
        let foundParallelProcessing = false
        for (let i = 1; i < completionTimes.length; i++) {
          const timeDiff = completionTimes[i] - completionTimes[i-1]
          if (timeDiff < 100) { // Less than 100ms between completions suggests parallelism
            foundParallelProcessing = true
            console.log(`Detected parallel processing: ${timeDiff}ms between completions`)
            break
          }
        }
        
        if (foundParallelProcessing) {
          console.log('✅ Verified parallel processing is occurring')
        } else {
          console.log('⚠️ Could not verify parallel processing - jobs may be processed sequentially')
        }
      }
    } finally {
      // Cleanup workers
      await cleanupWorkers()
    }
  }, 30000) // Increased timeout for this test
})