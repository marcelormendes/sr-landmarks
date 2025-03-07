# SuperRare Landmarks API

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11.0.11-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7.3-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.4.1-blue" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-6.4.1-red" alt="Redis" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

## 📋 Overview

SuperRare Landmarks API is a location-based service that provides information about landmarks and points of interest near specified geographic coordinates. The service leverages the Overpass API to retrieve real-world geographic data and offers a RESTful interface for retrieving landmark information.

### Key Features

- **Geographic Search**: Find landmarks near specified coordinates with customizable search radius
- **Geohash-based Caching**: Efficient spatial indexing with geohash and Redis-based caching
- **Authentication**: Secure endpoints with token-based authentication
- **Queue System**: Reliable message processing with BullMQ and Redis
- **Resilient Worker Architecture**: Multiple workers for high throughput processing
- **Asynchronous Processing**: Webhook-based asynchronous landmark processing for handling long-running queries
- **Swagger Documentation**: Interactive API documentation
- **Docker Support**: Easy containerization for deployment

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v10+)
- Redis (for caching)
- Docker & Docker Compose (optional, for containerized deployment)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sr-landmarks.git
   cd sr-landmarks
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
4. Edit the `.env` file with your configuration:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development  # development, production, test
   
   # Database
   DATABASE_FILE=landmarks.sqlite
   
   # Redis Cache
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_TTL=3600  # Cache TTL in seconds
   
   # Security
   JWT_SECRET=same-as-auth-secret-or-separate-jwt-secret
   
   # CORS Settings
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200
   
   # Overpass API
   OVERPASS_URL=https://overpass-api.de/api/interpreter
   OVERPASS_TIMEOUT=30000  # Timeout in milliseconds
   OVERPASS_MAX_RETRIES=3
   ```

5. Initialize database:
   ```bash
   npx prisma db push
   ```

### Running the Application

#### Development Mode

```bash
# Start in development mode with hot reloading
pnpm start:dev
```

#### Production Mode

```bash
# Build the application
pnpm build

# Start in production mode
pnpm start:prod
```

#### Using Docker

```bash
# Start with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down
```

### Accessing the API

The API will be available at `http://localhost:3000` by default. 

- **API Documentation**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`

## 📖 API Documentation

The API is documented using Swagger. Once the application is running, visit `/api/docs` in your browser for interactive documentation.

### Main Endpoints

- `GET /landmarks?lat=40.7128&lng=-74.0060`
  - Retrieve landmarks near specified coordinates
  - Parameters:
    - `lat`: Latitude (required)
    - `lng`: Longitude (required)
  
- `POST /webhook`
  - Asynchronous webhook endpoint for processing coordinates and retrieving landmarks
  - Requires authentication (Bearer token)
  - Request Body:
    ```json
    {
      "lat": 40.7128,  // Latitude (required)
      "lng": -74.0060, // Longitude (required)
      "radius": 500    // Search radius in meters (optional, defaults to 500)
    }
    ```
  - Returns a requestId that can be used to check the status:
    ```json
    {
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "pending"
    }
    ```

- `GET /webhook/:requestId`
  - Get the status of a previously submitted webhook request
  - Parameters:
    - `requestId`: UUID of the webhook request (required)
  - Response structure:
    ```json
    {
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed", // 'pending', 'completed', or 'failed'
      "createdAt": "2025-03-04T12:00:00.000Z",
      "completedAt": "2025-03-04T12:00:05.000Z",
      "coordinates": {
        "lat": 40.7128,
        "lng": -74.0060,
        "radius": 500
      },
      "error": "Error message if status is 'failed'" // Only present if status is 'failed'
    }
    ```
    
### Authentication

The API uses JWT-based authentication:

1. **Get a JWT token**:
   ```
   POST /auth/token
   {
     "apiKey": "your-auth-secret-key"
   }
   ```
   Response:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
     "expires_in": 3600,
     "token_type": "Bearer"
   }
   ```

2. **Use the token in requests**:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5...
   ```

The API key should be set in your `.env` file as `JWT_SECRET`.

### Get LandMarks Sample API Responses

```json
[
  {
    "name": "Empire State Building",
    "type": "attraction",
    "center": {
      "lat": 40.7484,
      "lng": -73.9857
    },
    "address": "350 5th Ave, New York, NY 10118",
    "moreInfo": {
      "wiki": "https://en.wikipedia.org/wiki/Empire_State_Building",
      "website": "https://www.esbnyc.com",
      "openingHours": "Mo-Su 08:00-22:00",
      "accessibility": "yes",
      "tourism": "sightseeing"
    }
  },
  {
    "name": "Times Square",
    "type": "attraction",
    "center": {
      "lat": 40.7580,
      "lng": -73.9855
    },
    "address": "Manhattan, NY 10036",
    "moreInfo": {
      "wiki": "https://en.wikipedia.org/wiki/Times_Square",
      "tourism": "sightseeing"
    }
  }
]
```

### Landmark Fields

Each landmark in the response may include the following fields:

#### Required Fields
- `name`: Name of the landmark
- `type`: Type of the landmark (e.g., 'attraction', 'monument', 'building')
- `center`: Geographic coordinates
  - `lat`: Latitude
  - `lng`: Longitude

#### Optional Fields
- `address`: Full address of the landmark (if available)
- `moreInfo`: Additional information about the landmark
  - `wiki`: Wikipedia or Wikidata URL
  - `website`: Official website URL
  - `openingHours`: Operating hours
  - `accessibility`: Wheelchair accessibility information
  - `tourism`: Tourism-related information

Note: Optional fields will only be present if the data is available from the Overpass API.

## 🧪 Testing & CI

### Running Tests

```bash
# Run unit tests
pnpm test

# Run end-to-end tests
pnpm test:e2e

# Run worker tests (requires Redis)
pnpm test:workers

# Generate test coverage report
pnpm test:cov
```

### Local CI Environment

The project includes a local CI script that runs all checks before committing code:

```bash
# Run all CI checks locally
pnpm run ci

# Run basic checks before committing (lint and unit tests)
pnpm run pre-commit
```

The CI script performs the following checks:
1. Starts Redis if needed (requires Docker)
2. Builds the application
3. Runs linting
4. Runs unit tests
5. Runs E2E tests
6. Optionally runs worker tests

### GitHub Actions CI

The project uses GitHub Actions for Continuous Integration. The CI pipeline runs on every push and pull request to the main branch, performing the following checks:

1. **Lint Check**: Verifies code style and quality
2. **Unit Tests**: Runs all unit tests
3. **E2E Tests**: Runs end-to-end API tests
4. **Worker Tests**: Tests the worker scaling functionality
5. **Build Check**: Ensures the application builds successfully

To see the CI status, check the Actions tab in the GitHub repository.

### Test Environment

The application automatically uses test configuration when `NODE_ENV=test`, which sets up:

- A separate SQLite database for testing
- Fixed authentication tokens for API testing
- Simplified configuration for reliable testing
- In-memory Redis for caching and queue tests

### Worker Architecture & Testing

The application includes a dedicated worker implementation (`src/worker.ts`) that:
- Creates a minimal NestJS application with only worker-related modules
- Connects to Redis and listens for queue jobs
- Provides health check endpoint for monitoring
- Can run independently from the main API server

To start a worker:
```bash
# Development mode
pnpm start:worker:dev

# Production mode (after build)
pnpm start:worker
```

The worker tests verify that multiple worker processes can process jobs from the same queue:

1. The test spawns multiple worker instances using the built worker
2. Creates multiple webhook requests to be processed
3. Verifies that all requests are completed by the workers
4. Analyzes job completion timestamps to detect parallel processing

Requirements for worker tests:
- Redis server running on localhost:6379
- Node.js with increased memory limit (`--max-old-space-size=4096`)
- Built application (`pnpm build` before running tests)

### Debugging Tests

When tests fail, check the following common issues:

1. **Type Mismatches**: Ensure mock objects match the expected types from Prisma
2. **Authentication**: Many endpoints require proper auth headers in tests
3. **Database State**: Ensure the test database is properly reset between test runs
4. **Redis Connection**: For cache and worker tests, ensure Redis is running
5. **Environment Variables**: The `.env.test` file should contain all necessary variables

## 🏗️ Architecture

The application follows a modular architecture based on NestJS principles:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and application workflows
- **Repositories**: Handle data access and persistence
- **DTOs**: Define data transfer objects for API input/output
- **Modules**: Group related functionality
- **Pipes**: Handle request validation and transformation

### Key Components

- **Landmarks Service**: Main business logic for finding landmarks
- **Overpass Service**: Interfaces with the Overpass API
- **Cache Service**: Manages Redis caching and geohash-based lookups
- **Auth Guard**: Handles API authentication
- **Webhook Service**: Manages asynchronous landmark processing
- **Queue Service**: Manages job creation and submission to BullMQ
- **Queue Consumer**: Processes jobs from the queue
- **Worker Process**: Dedicated process for consuming queue jobs
- **Prisma Service**: Database access via Prisma ORM

### Database Schema

The application uses a SQLite database with two main tables:

1. **Landmark**: Stores individual landmarks
   - Contains name, type, coordinates, and geohash
   - Geohash provides efficient spatial indexing
   - Supports fast lookups by geographic area

2. **WebhookRequest**: Tracks asynchronous webhook processing
   - Contains request metadata: requestId, status, coordinates, radius
   - Tracks processing status ('pending', 'completed', 'failed')
   - Stores error information if processing fails
   - Enables asynchronous processing and status checking

### Caching Architecture

The application implements a simplified caching strategy using geohash:

1. **Spatial Indexing**: Geographic coordinates are converted to direct geohash strings used as cache keys
2. **Direct Redis Caching**: 
   - Pure geohash-based caching with no prefixes
   - Single centralized CacheService for all caching operations
3. **Clean Lookup Flow**:
   - Use geohash as direct key in Redis cache
   - If not found, check database using same geohash
   - If not in database, fetch from Overpass API
   - Store API results in both database and cache


## 🔧 Configuration

### Main Configuration Options

- **Port**: The port on which the application runs (default: 3000)
- **Environment**: Development, production, or test
- **Database**: SQLite database path
- **Redis**: Host, port, and TTL settings
- **Auth Secret**: Secret key for authentication
- **CORS**: Allowed origins for CORS
- **Overpass API**: URL, timeout, and retry settings

### Advanced Configuration

For advanced configuration options, check the `src/config/configuration.ts` file.

## 🛠️ Development

### Queue System & Worker Architecture

The application uses a robust queue system with BullMQ for processing webhook requests:

1. **Message Queue**: Uses Redis as a reliable message broker with BullMQ
2. **Worker Architecture**: Multiple worker processes consume jobs from the queue
3. **Job Lifecycle**: Each job goes through a defined lifecycle with proper error handling
4. **Automatic Retries**: Failed jobs are automatically retried with exponential backoff
5. **Distributed Processing**: Workers can be horizontally scaled across multiple containers

Benefits of this queue-based architecture:
- **Reliability**: Messages are persisted in Redis and won't be lost if the system crashes
- **Scalability**: Can handle high throughput by adding more worker instances
- **Resilience**: Automatic retries and failure handling
- **Load Distribution**: Evenly distributes work across available workers
- **Monitoring**: Comprehensive job status tracking and worker health monitoring

### Worker Configuration

Workers are configured in the docker-compose.yml file:

```yaml
worker:
  build:
    context: .
    args:
      ENTRY_FILE: worker.js
  environment:
    SERVICE_TYPE: worker
  deploy:
    replicas: 3  # Number of worker instances
```

To scale workers:
- Modify the `replicas` value to increase/decrease worker count
- Use `docker-compose up --scale worker=5` to dynamically adjust worker count
- Each worker has a unique ID for tracking in distributed environments

### Asynchronous Webhook Processing

The application implements an asynchronous processing pattern for the webhook endpoint:

1. **Request Submission**: Client submits coordinates via the `/webhook` endpoint
2. **Request Tracking**: System generates a unique UUID and returns it immediately
3. **Job Creation**: A job is added to the queue for processing
4. **Background Processing**: Workers retrieve jobs from the queue and process them
5. **Status Checking**: Client can check the status using the `/webhook/:requestId` endpoint
6. **Result Retrieval**: Once processing is complete, results can be retrieved

This approach offers several advantages:
- **Improved User Experience**: Clients don't have to wait for potentially long-running operations
- **Reliability**: Processing continues even if the client disconnects or server restarts
- **Scalability**: Backend can process multiple requests concurrently with multiple workers
- **Monitoring**: Request status can be tracked throughout the process


## 📝 License

This project is [MIT licensed](LICENSE)