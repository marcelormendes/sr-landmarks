#!/bin/bash

# Parse command line arguments
API_ONLY=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --api-only) API_ONLY=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Store the Node.js process ID
NEST_PID=""

# Function to cleanup on script exit
cleanup() {
    echo -e "\nCleaning up..."
    
    # Kill the NestJS process if it exists
    if [ ! -z "$NEST_PID" ]; then
        echo "Stopping NestJS application..."
        kill -SIGTERM $NEST_PID 2>/dev/null
        wait $NEST_PID 2>/dev/null
    fi
    
    # Stop all containers
    echo "Shutting down containers..."
    docker compose down -v
    
    # Kill any remaining node processes started by this script
    echo "Ensuring all processes are stopped..."
    pkill -P $$ 2>/dev/null
    
    exit 0
}

# Register the cleanup function for different signals
trap cleanup SIGINT SIGTERM SIGHUP EXIT

# Ensure clean state
echo "Ensuring clean state..."
docker compose down -v

if [ "$API_ONLY" = true ]; then
    echo "Running in API-only mode (workers will run in Docker)..."
    # Start Redis and worker containers
    echo "Starting Redis and worker containers..."
    docker compose up -d redis worker
else
    echo "Running in full mode (workers will run locally)..."
    # Start only Redis
    echo "Starting Redis container..."
    docker compose up -d redis
fi

# Function to check if a container is healthy
check_container() {
    local service=$1
    local containers=$(docker compose ps -q $service)
    
    if [ -z "$containers" ]; then
        echo "No containers found for service: $service"
        return 1
    fi

    # For Redis, just check if it's running
    if [ "$service" = "redis" ]; then
        local status=$(docker inspect -f '{{.State.Status}}' $containers)
        if [ "$status" = "running" ]; then
            return 0
        fi
        return 1
    fi

    # For workers, check if all instances are running and have initialized
    if [ "$service" = "worker" ]; then
        for container_id in $containers; do
            local status=$(docker inspect -f '{{.State.Status}}' $container_id)
            if [ "$status" != "running" ]; then
                echo "Worker container $container_id is not running (status: $status)"
                return 1
            fi
            
            # Check logs for successful initialization message
            if ! docker logs $container_id 2>&1 | grep -q "Worker started successfully"; then
                echo "Worker $container_id hasn't initialized yet"
                return 1
            fi
        done
        echo "All worker instances are running and initialized"
        return 0
    fi

    return 1
}

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
    if check_container "redis" && docker compose exec redis redis-cli ping > /dev/null 2>&1; then
        echo "Redis is ready!"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Redis failed to start after $MAX_RETRIES attempts"
        cleanup
        exit 1
    fi
    echo "Waiting for Redis... Attempt $i/$MAX_RETRIES"
    sleep 2
done

if [ "$API_ONLY" = true ]; then
    # Wait for worker to be ready
    echo "Waiting for worker to be ready..."
    for i in $(seq 1 $MAX_RETRIES); do
        if check_container "worker"; then
            echo "All workers are ready and initialized!"
            break
        fi
        if [ $i -eq $MAX_RETRIES ]; then
            echo "Workers failed to initialize after $MAX_RETRIES attempts"
            echo "Full worker logs:"
            docker compose logs worker
            cleanup
            exit 1
        fi
        echo "Waiting for workers... Attempt $i/$MAX_RETRIES"
        sleep 2
    done
fi

# Show final status
echo -e "\nFinal Container Status:"
docker compose ps

# Get Redis host IP for local development
REDIS_HOST=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker compose ps -q redis))
echo "Redis is available at: $REDIS_HOST"

# Start NestJS application in watch mode with environment variables
if [ "$API_ONLY" = true ]; then
    echo -e "\nStarting NestJS application (API only)..."
    REDIS_HOST=$REDIS_HOST \
    REDIS_PORT=6379 \
    REDIS_TTL=3600 \
    NODE_ENV=development \
    SERVICE_TYPE=api \
    nest start --watch & NEST_PID=$!
else
    echo -e "\nStarting NestJS application (Full mode with local workers)..."
    REDIS_HOST=$REDIS_HOST \
    REDIS_PORT=6379 \
    REDIS_TTL=3600 \
    NODE_ENV=development \
    nest start --watch & NEST_PID=$!
fi

# Wait for the NestJS process
wait $NEST_PID 