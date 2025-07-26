#!/bin/bash

# Build script for local Docker development

set -e

echo "🏗️  Building WorkshopTracker for Docker..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf node_modules/.vite-temp
rm -rf .vite

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build application
echo "🔨 Building application..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t workshoptracker:latest .

echo "✅ Build completed successfully!"
echo ""
echo "To run with Docker Compose:"
echo "  docker-compose up -d"
echo ""
echo "To run standalone:"
echo "  docker run -p 5000:5000 --env-file .env workshoptracker:latest"