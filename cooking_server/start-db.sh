#!/bin/bash

# Cooking Server - Database Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍳 Cooking Server - Database Setup${NC}"
echo "=================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install docker-compose.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Starting PostgreSQL database and pgAdmin...${NC}"

# Start the database container
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "cooking_server_db.*Up" && docker-compose ps | grep -q "cooking_server_pgadmin.*Up"; then
    echo -e "${GREEN}✅ Database and pgAdmin are running successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Database Information:${NC}"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: cooking_db"
    echo "  Username: postgres"
    echo "  Password: postgres_password"
    echo ""
    echo -e "${BLUE}📊 pgAdmin Information:${NC}"
    echo "  URL: http://localhost:8081"
    echo "  Email: admin@cooking.local"
    echo "  Password: admin_password"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Connect to DB: docker-compose exec postgres psql -U postgres -d cooking_db"
    echo "  Restart services: docker-compose restart"
    echo ""
    echo -e "${GREEN}🚀 You can now start your Go application!${NC}"
    echo -e "${YELLOW}💡 Access pgAdmin at http://localhost:8081 to manage your database${NC}"
else
    echo -e "${RED}❌ Failed to start containers${NC}"
    docker-compose logs
    exit 1
fi
