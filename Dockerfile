# Use Debian 11 (Bullseye) which still has libssl1.1
FROM node:18-bullseye-slim

# Set the working directory inside the container
WORKDIR /app

# Install OpenSSL and other required dependencies
RUN apt-get update -y && \
    apt-get install -y openssl libssl1.1 sqlite3 redis-tools && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally as root
RUN npm install -g pnpm

# Create non-root user
RUN adduser --disabled-password --gecos "" nodejs && \
    chown nodejs:nodejs /app

# Create data directory with proper permissions
RUN mkdir -p /data && chown nodejs:nodejs /data

# Create the entrypoint script
COPY --chown=nodejs:nodejs <<'EOF' /app/docker-entrypoint.sh
#!/bin/bash
set -e

# Function to wait for Redis
wait_for_redis() {
  echo "Waiting for Redis..."
  while ! redis-cli -h $REDIS_HOST ping > /dev/null 2>&1; do
    sleep 1
  done
  echo "Redis is up!"
}

# Initialize the database if we're the first instance
init_database() {
  if [ "$SERVICE_TYPE" = "api" ]; then
    echo "Initializing database..."
    mkdir -p "$(dirname $DATABASE_FILE)"
    rm -f "$DATABASE_FILE"
    redis-cli -h $REDIS_HOST FLUSHALL
    pnpm prisma migrate reset --force
    echo "Database initialization complete!"
  elif [ "$SERVICE_TYPE" = "worker" ]; then
    echo "Worker service starting..."
    mkdir -p "$(dirname $DATABASE_FILE)"
  fi
}

# Main startup sequence
wait_for_redis
init_database

# Start the application
echo "Starting $SERVICE_TYPE service..."
exec node "dist/${ENTRY_FILE}"
EOF

RUN chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER nodejs

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy prisma files
COPY --chown=nodejs:nodejs prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the files
COPY --chown=nodejs:nodejs . .

# Build the application
RUN pnpm run build

# Allow specifying a different entry file for the worker
ARG ENTRY_FILE=main.js
ENV ENTRY_FILE=$ENTRY_FILE

# Expose the application port
EXPOSE 3000 3100

# Set NODE_ENV to production
ENV NODE_ENV=production

# Use the entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]