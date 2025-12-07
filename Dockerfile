FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (allow updates to fix conflicts)
RUN pnpm install

# Copy rest of code
COPY . .

# Build the app
RUN pnpm build

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start
CMD ["node", "dist/server/node-build.mjs"]
