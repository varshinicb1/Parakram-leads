#!/bin/bash
set -e

echo "=== Sigma Lead Intelligence - Production Deployment ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is required but not installed.${NC}"; exit 1; }

# Load environment
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    cp backend/.env.example .env
    echo -e "${RED}Please edit .env with your production values and re-run this script.${NC}"
    exit 1
fi

echo -e "${GREEN}1. Pulling latest images...${NC}"
docker-compose -f docker-compose.prod.yml pull

echo -e "${GREEN}2. Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

echo -e "${GREEN}3. Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || true

echo -e "${GREEN}4. Checking health...${NC}"
sleep 5
curl -s http://localhost:8000/health && echo "" || echo -e "${YELLOW}Health check pending...${NC}"

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Frontend: https://yourdomain.com"
echo -e "API:      https://yourdomain.com/api/"
echo -e "Health:   https://yourdomain.com/health"
