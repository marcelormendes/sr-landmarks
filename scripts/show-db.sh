#!/bin/bash

# Get the API container ID
CONTAINER_ID=$(docker ps -q -f name=superrare-landmarks-api-1)

if [ -z "$CONTAINER_ID" ]; then
    echo "Error: API container not found. Make sure it's running."
    echo "Running containers:"
    docker ps
    exit 1
fi

echo "=== Landmarks Table ==="
echo "SELECT * FROM landmarks;" | docker exec -i $CONTAINER_ID sqlite3 -column -header /app/prisma/dev.db

echo -e "\n=== Webhook Requests Table ==="
echo "SELECT * FROM webhook_requests;" | docker exec -i $CONTAINER_ID sqlite3 -column -header /app/prisma/dev.db

# Add option for specific queries
if [ "$1" = "--watch" ]; then
    echo -e "\nWatching for new records (Ctrl+C to stop)..."
    while true; do
        clear
        echo "=== Landmarks Table ==="
        echo "SELECT * FROM landmarks;" | docker exec -i $CONTAINER_ID sqlite3 -column -header /app/prisma/dev.db
        echo -e "\n=== Webhook Requests Table ==="
        echo "SELECT * FROM webhook_requests;" | docker exec -i $CONTAINER_ID sqlite3 -column -header /app/prisma/dev.db
        sleep 2
    done
fi