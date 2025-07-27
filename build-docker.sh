#!/bin/bash

# Enhanced Docker build script for WorkshopTracker

set -e

echo "🏗️  Building WorkshopTracker for Docker deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf node_modules/.vite-temp
rm -rf .vite

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down -v 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build application
echo "🔨 Building application..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t workshoptracker:latest .

# Start with fresh database
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Show logs
echo "📋 Service status:"
docker-compose ps

echo ""
echo "✅ Docker deployment completed successfully!"
echo ""
echo "🌐 Access the application at: http://localhost:5000"
echo "🔑 Default admin credentials: admin / admin123"
echo ""
echo "📊 Check logs with:"
echo "  docker-compose logs -f app"
echo ""
echo "🛠️  Access database with:"
echo "  docker-compose exec postgres psql -U workshop -d workshoptracker"