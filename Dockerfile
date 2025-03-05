# Use Debian 11 (Bullseye) which still has libssl1.1
FROM node:18-bullseye-slim

# Set the working directory inside the container
WORKDIR /app

# Install OpenSSL and other required dependencies
RUN apt-get update -y && \
    apt-get install -y openssl libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally as root
RUN npm install -g pnpm

# Create non-root user
RUN adduser --disabled-password --gecos "" nodejs && \
    chown nodejs:nodejs /app

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

# Command to run the application (configurable via docker-compose)
CMD ["sh", "-c", "node dist/${ENTRY_FILE}"]