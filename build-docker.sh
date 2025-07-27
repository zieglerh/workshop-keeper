#!/bin/bash

# Enhanced Docker build script for WorkshopTracker

set -e

echo "🏗️  Building WorkshopTracker for Docker deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf node_modules
rm -rf .vite

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Start database
docker compose up db -d

# Build application
echo "🔨 Building application..."
docker compose build app --no-cache

# Copy build files for IDE usage
docker compose cp app:/app/dist ./dist
docker compose cp app:/app/node_modules ./node_modules

# Start application
docker compose up -d

# Show logs
echo "📋 Service status:"
docker compose ps

echo ""
echo "✅ Docker deployment completed successfully!"
echo ""
echo "🌐 Access the application at: http://localhost:5000"
echo "🔑 Default admin credentials: admin / admin123"
echo ""
echo "📊 Check logs with:"
echo "  docker compose logs -f app"
echo ""
echo "🛠️  Access database with:"
echo "  docker compose exec postgres psql -U workshop -d workshoptracker"
