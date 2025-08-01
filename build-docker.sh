#!/bin/bash

# Enhanced Docker build script for WorkshopTracker

set -e

echo "🏗️  Building WorkshopTracker for Docker deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf node_modules

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Start database
docker compose up db -d

# Build application
echo "🔨 Building application..."
docker compose build app --no-cache

# Start application
docker compose up -d

# Update DB
docker compose exec app npm run db:push

# Copy build files for IDE usage
docker compose cp app:/app/dist ./
docker compose cp app:/app/node_modules ./

echo ""
echo "✅ Docker deployment completed successfully!"
