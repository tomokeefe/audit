# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build server only (backend API)
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built server from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the Node.js server
CMD ["node", "dist/server/node-build.mjs"]
