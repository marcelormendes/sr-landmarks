#!/bin/bash

# Get the container ID
CONTAINER_ID=$(docker ps -q -f name=superrare-landmarks-api)

if [ -z "$CONTAINER_ID" ]; then
    echo "Error: superrare-landmarks-api container is not running"
    echo "Running containers:"
    docker ps
    exit 1
fi

# Follow the logs
echo "Following logs for container $CONTAINER_ID..."
docker logs -f "$CONTAINER_ID" 