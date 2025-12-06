FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the app
RUN pnpm build

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start
CMD ["node", "dist/server/node-build.mjs"]
