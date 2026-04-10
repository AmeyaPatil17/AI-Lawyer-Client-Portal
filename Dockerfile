# Stage 1: Build Client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
# Use npm install instead of ci to fix lockfile mismatches from version downgrades
RUN npm install
COPY client/ ./
# Build output is typically in /app/client/dist
RUN npm run build

# Stage 2: Build Server
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
# Use npm install for consistency
RUN npm install
COPY server/ ./
# Build output is typically in /app/server/dist
RUN npm run build

# Stage 3: Final Production Image
FROM node:22-alpine
WORKDIR /app

# Set production env
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies for server
COPY server/package*.json ./
RUN npm install --only=production

# Copy Server Build Artifacts
COPY --from=server-build /app/server/dist ./dist

# Copy Client Build Artifacts to server/public
COPY --from=client-build /app/client/dist ./public

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start command
CMD ["node", "dist/index.js"]
