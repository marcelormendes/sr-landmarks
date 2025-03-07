#!/bin/bash

# Function to cleanup processes on exit
cleanup() {
    echo "Cleaning up..."
    docker compose down
    exit
}

# Setup cleanup trap
trap cleanup EXIT

# Ensure script stops on first error
set -e

echo "Starting Redis and other services..."
docker compose up redis -d

echo "Waiting for Redis to be ready..."
sleep 2

echo "Running e2e tests..."
jest --config ./test/jest-e2e.json

# Cleanup will be handled by the trap 