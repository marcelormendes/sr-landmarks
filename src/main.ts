import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { ConfigService } from '@nestjs/config'
import { GlobalExceptionFilter } from './exceptions/http-exception.filter'
import { Logger, ValidationPipe } from '@nestjs/common'
import { json, urlencoded } from 'express'
import helmet from 'helmet'
import { LandmarkDto, LandmarkLocationDto } from './dto/landmark.dto'
import {
  WebhookRequestDto,
  WebhookResponseDto,
  WebhookStatusDto,
  WebhookSummaryDto,
  CoordinatesDto,
} from './dto/webhook.dto'

async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  // Enable shutdown hooks
  app.enableShutdownHooks()

  // Get config service
  const configService = app.get(ConfigService)
  const isDevelopment = configService.get('env') !== 'production'

  // Apply security headers with Helmet
  app.use(helmet())

  // Configure validation pipe
  // We use Zod for schema-based validation instead of class-validator/class-transformer
  app.useGlobalPipes(new ZodValidationPipe())

  // Set up Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Landmarks API')
    .setDescription('API for finding landmarks near specified coordinates')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('landmarks', 'Endpoints for retrieving landmark data')
    .addTag('health', 'Health check endpoints')
    .addTag('webhook', 'Webhook processing endpoints')
    .setContact(
      'API Support',
      'https://example.com/support',
      'support@example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build()

  // DTOs have been imported at the top of the file

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      LandmarkDto,
      LandmarkLocationDto,
      WebhookRequestDto,
      WebhookResponseDto,
      WebhookStatusDto,
      WebhookSummaryDto,
      CoordinatesDto,
    ],
  })
  // Set up Swagger at both /api and /api/docs paths
  SwaggerModule.setup('api', app, document)
  SwaggerModule.setup('api/docs', app, document)

  // Add global exception filter with config service
  app.useGlobalFilters(new GlobalExceptionFilter(configService))

  // Configure body parsing with reasonable limits
  app.use(json({ limit: '1mb' }))
  app.use(urlencoded({ extended: true, limit: '1mb' }))

  // Configure CORS with proper restrictions
  app.enableCors({
    origin:
      configService.get<string>('cors.allowedOrigins') ||
      (isDevelopment ? '*' : undefined),
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 3600,
  })

  // Start server
  const port = configService.get<number>('port') || 3000
  await app.listen(port)

  // Add graceful shutdown handlers
  const signals = ['SIGTERM', 'SIGINT'] as const
  signals.forEach((signal) => {
    process.on(signal, () => {
      Logger.log(`Received ${signal}, gracefully shutting down...`)
      void app.close().then(() => process.exit(0))
    })
  })

  const appUrl = await app.getUrl()
  Logger.log(`Application is running on: ${appUrl}`)
  Logger.log(
    `Swagger documentation: http://localhost:${port}/api or http://localhost:${port}/api/docs`,
  )
}

void bootstrap().catch((err: unknown) => {
  const error = err as Error
  Logger.error(`Error during bootstrap: ${error.message}`, error.stack)
  process.exit(1)
})
