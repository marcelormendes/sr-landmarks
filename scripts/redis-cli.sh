#!/bin/bash

# Get the Redis container ID
REDIS_CONTAINER=$(docker ps -qf "name=superrare-landmarks-redis-1")

if [ -z "$REDIS_CONTAINER" ]; then
    echo "Redis container not found. Make sure it's running."
    exit 1
fi

echo "Connecting to Redis CLI..."
docker exec -it $REDIS_CONTAINER redis-cli 