# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S workshop -u 1001

# Change ownership
RUN chown -R workshop:nodejs /app
USER workshop

# Expose port
EXPOSE 5000

# Health check
#HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#  CMD node -e "const http = require('http'); http.get('http://db:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start the application
#CMD ["node", "dist/index.js"]
CMD ["npm", "run", "dev:server"]
