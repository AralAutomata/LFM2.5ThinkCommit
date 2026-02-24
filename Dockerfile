# Multi-stage Dockerfile for ThinkCommit Deno Application
# Stage 1: Build and cache dependencies
FROM denoland/deno:1.40.0 AS builder

WORKDIR /app

# Copy all application files
COPY . .

# Cache Deno dependencies (this layer will be cached if dependencies don't change)
RUN deno cache main.ts 2>/dev/null || true

# Stage 2: Runtime image
FROM denoland/deno:1.40.0 AS runtime

WORKDIR /app

# Install curl for health checks (optional, can be removed)
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy application files from builder
COPY --from=builder --chown=deno:deno /app .

# Create directories for keys and records (will be mounted as volumes)
RUN mkdir -p /app/keys /app/records && chown deno:deno /app/keys /app/records

# Switch to deno user for security
USER deno

# Default command (can be overridden in docker-compose)
ENTRYPOINT ["deno", "run", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-net"]
CMD ["main.ts"]
