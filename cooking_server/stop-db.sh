#!/bin/bash

# Cooking Server - Database Stop Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍳 Cooking Server - Stopping Services${NC}"
echo "======================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running.${NC}"
    exit 1
fi

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Stopping PostgreSQL database and pgAdmin...${NC}"

# Stop the containers
docker-compose down

echo -e "${GREEN}✅ Services stopped successfully!${NC}"
echo ""
echo -e "${BLUE}🔧 Additional Commands:${NC}"
echo "  Remove volumes: docker-compose down -v"
echo "  Remove everything: docker-compose down -v --rmi all"
echo "  Start services: ./start-db.sh"
