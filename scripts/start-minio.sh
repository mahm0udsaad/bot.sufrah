#!/bin/bash

# Start MinIO for Sufrah Dashboard
# This script starts MinIO using Docker Compose and verifies it's running correctly

set -e

echo "🚀 Starting MinIO for Sufrah Dashboard..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose file exists
if [ ! -f "docker-compose.minio.yml" ]; then
    echo "❌ docker-compose.minio.yml not found"
    echo "   Make sure you're running this from the project root"
    exit 1
fi

# Start MinIO
echo "📦 Starting MinIO container..."
docker compose -f docker-compose.minio.yml up -d

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO to be ready..."
sleep 3

# Check if MinIO is running
if docker ps | grep -q sufrah-minio; then
    echo "✅ MinIO is running!"
    echo ""
    echo "📍 MinIO endpoints:"
    echo "   API:     http://localhost:9000"
    echo "   Console: http://localhost:9001"
    echo ""
    echo "🔑 Credentials:"
    echo "   Username: minioadmin"
    echo "   Password: minioadmin123"
    echo ""
    
    # Test MinIO health
    if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo "✅ MinIO health check passed"
    else
        echo "⚠️  MinIO health check failed (but container is running)"
    fi
    
    echo ""
    echo "📝 Next steps:"
    echo "   1. Make sure .env.local has:"
    echo "      MINIO_ENDPOINT=http://localhost:9000"
    echo "      MINIO_ENABLED=true"
    echo ""
    echo "   2. Start the dashboard:"
    echo "      pnpm dev"
    echo ""
    echo "   3. Try uploading a file in the chat interface"
    echo ""
    echo "📚 See MEDIA_UPLOAD_SETUP.md for detailed documentation"
    echo ""
    
else
    echo "❌ Failed to start MinIO"
    echo ""
    echo "Check the logs:"
    echo "   docker compose -f docker-compose.minio.yml logs"
    exit 1
fi

