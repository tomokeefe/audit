# Build stage - frontend and backend
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY . .

# Build Vite frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server ./server

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "server/index.ts"]
