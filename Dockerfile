FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build only the client (SPA)
RUN pnpm run build:client

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Expose port (Railway uses PORT env variable)
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the server using tsx for direct TypeScript execution
CMD ["npx", "tsx", "server/start-production.ts"]
