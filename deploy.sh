#!/bin/bash

# Music Downloader Deployment Script
# Usage: ./deploy.sh [build|deploy|clean]

set -e

PROJECT_NAME="music-downloader"
IMAGE_NAME="music-downloader-app"
CONTAINER_NAME="music-downloader-container"

echo "🎵 Music Downloader Deployment Script"
echo "====================================="

case "$1" in
    
    deploy)
        echo "🚀 Deploying application with Docker Compose..."
        
        # Stop existing services
        echo "Stopping existing services..."
        docker-compose -f /home/docker-app/music-downloader/docker-compose.yml down 2>/dev/null || true
        
        # Start services with build
        echo "Building and starting services..."
        docker-compose -f /home/docker-app/music-downloader/docker-compose.yml up -d --build
        
        echo "✅ Deployment completed!"
        echo "Application is running on http://localhost"
        ;;
    
    clean)
        echo "🧹 Cleaning up Docker Compose services..."
        docker-compose -f /home/docker-app/music-downloader/docker-compose.yml down -v 2>/dev/null || true
        docker-compose -f /home/docker-app/music-downloader/docker-compose.yml rm -f 2>/dev/null || true
        echo "✅ Cleanup completed!"
        ;;
    
    *)
        echo "Usage: $0 [build|deploy|clean]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the application using Docker Compose"
        echo "  clean   - Clean up Docker Compose services"
        echo ""
        echo "Examples:"
        echo "  $0 deploy"
        echo "  $0 clean"
        exit 1
        ;;
esac