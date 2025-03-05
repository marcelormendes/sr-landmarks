#!/bin/bash
set -e

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}     Running Local CI Pipeline       ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Start Redis if not already running
echo -e "\n${YELLOW}Checking if Redis is running...${NC}"
if command -v docker &> /dev/null; then
  # Check if Redis container is running
  if ! docker ps | grep -q redis; then
    echo -e "${YELLOW}Starting Redis container...${NC}"
    docker run --name ci-redis -p 6379:6379 -d redis || \
    docker start ci-redis || \
    echo -e "${RED}Failed to start Redis container. Make sure Docker is running.${NC}"
  else
    echo -e "${GREEN}Redis container is already running.${NC}"
  fi
else
  echo -e "${YELLOW}Docker not found. Please ensure Redis is running on localhost:6379${NC}"
fi

# Building the application
echo -e "\n${YELLOW}Building the application...${NC}"
pnpm build || { echo -e "${RED}Build failed${NC}"; exit 1; }
echo -e "${GREEN}Build successful${NC}"

# Running linting
echo -e "\n${YELLOW}Running ESLint...${NC}"
pnpm lint || { echo -e "${RED}Linting failed${NC}"; exit 1; }
echo -e "${GREEN}Linting successful${NC}"

# Running unit tests
echo -e "\n${YELLOW}Running unit tests...${NC}"
pnpm test || { echo -e "${RED}Unit tests failed${NC}"; exit 1; }
echo -e "${GREEN}Unit tests successful${NC}"

# Running E2E tests
echo -e "\n${YELLOW}Running E2E tests...${NC}"
REDIS_HOST=localhost REDIS_PORT=6379 pnpm test:e2e || { echo -e "${RED}E2E tests failed${NC}"; exit 1; }
echo -e "${GREEN}E2E tests successful${NC}"

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}     All CI checks passed!           ${NC}"
echo -e "${GREEN}=====================================${NC}"