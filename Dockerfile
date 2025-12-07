FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy rest of code
COPY . .

# Build the app (no environment variables needed for build)
RUN pnpm build

# Expose port
EXPOSE 8080

# Runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "dist/server/node-build.mjs"]
