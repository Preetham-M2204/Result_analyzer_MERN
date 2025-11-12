#!/bin/bash

# ================================================================
# VTU Results Analyzer - Interactive Docker Setup Script (Linux/Mac)
# ================================================================
# This script will prompt for database credentials and set up
# your Docker environment securely without hardcoded passwords
# ================================================================

echo "🚀 VTU Results Analyzer - Docker Setup"
echo "======================================="
echo ""

# Function to read password securely
read_password() {
    echo -n "$1"
    read -s password
    echo ""
    echo "$password"
}

# Collect Database Credentials
echo "📊 Database Configuration"
echo "========================="

# MySQL Configuration
echo ""
echo "MySQL Database Configuration:"
read -p "Enter MySQL Host [default: localhost]: " MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-localhost}

read -p "Enter MySQL Username [default: root]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}

MYSQL_PASSWORD=$(read_password "Enter MySQL Password: ")

read -p "Enter MySQL Database Name [default: resana]: " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-resana}

# MongoDB Configuration
echo ""
echo "MongoDB Configuration:"
read -p "Enter MongoDB Host [default: localhost]: " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-localhost}

read -p "Enter MongoDB Port [default: 27017]: " MONGODB_PORT
MONGODB_PORT=${MONGODB_PORT:-27017}

read -p "Enter MongoDB Database Name [default: vtu_auth]: " MONGODB_DATABASE
MONGODB_DATABASE=${MONGODB_DATABASE:-vtu_auth}

# JWT Configuration
echo ""
echo "Security Configuration:"
read -p "Enter JWT Secret [press Enter for auto-generated]: " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT Secret: $JWT_SECRET"
fi

# Port Configuration
echo ""
echo "Port Configuration:"
read -p "Enter Backend Port [default: 5000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-5000}

read -p "Enter Frontend Port [default: 80]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-80}

read -p "Enter Scraper Port [default: 8001]: " SCRAPER_PORT
SCRAPER_PORT=${SCRAPER_PORT:-8001}

# Create Backend .env file
echo ""
echo "📝 Creating environment files..."

cat > backend/.env << EOF
# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# MongoDB Configuration (for authentication)
MONGODB_URI=mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}

# MySQL Configuration (for results data)
MYSQL_HOST=$MYSQL_HOST
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:$FRONTEND_PORT

# Scraper Service
SCRAPER_SERVICE_URL=http://python-scraper:$SCRAPER_PORT
EOF

echo "✅ Created backend/.env"

# Create Frontend .env file
cat > Result_Analyzer/.env << EOF
# API Configuration
# Base URL for backend API - NO /api suffix needed (it's already in route paths)
VITE_API_URL=http://localhost:$BACKEND_PORT
EOF

echo "✅ Created Result_Analyzer/.env"

# Create Docker Compose Override File
cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  python-scraper:
    environment:
      MYSQL_HOST: host.docker.internal
      MYSQL_PORT: 3306
      MYSQL_USER: $MYSQL_USER
      MYSQL_PASSWORD: $MYSQL_PASSWORD
      MYSQL_DATABASE: $MYSQL_DATABASE
      TESSERACT_CMD: /usr/bin/tesseract
    ports:
      - "${SCRAPER_PORT}:${SCRAPER_PORT}"

  backend:
    environment:
      NODE_ENV: production
      PORT: $BACKEND_PORT
      MYSQL_HOST: host.docker.internal
      MYSQL_PORT: 3306
      MYSQL_USER: $MYSQL_USER
      MYSQL_PASSWORD: $MYSQL_PASSWORD
      MYSQL_DATABASE: $MYSQL_DATABASE
      MONGODB_URI: mongodb://host.docker.internal:${MONGODB_PORT}/${MONGODB_DATABASE}
      JWT_SECRET: $JWT_SECRET
      JWT_EXPIRE: 24h
      SCRAPER_SERVICE_URL: http://python-scraper:${SCRAPER_PORT}
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"

  frontend:
    environment:
      VITE_API_URL: http://localhost:$BACKEND_PORT
    ports:
      - "${FRONTEND_PORT}:80"
EOF

echo "✅ Created docker-compose.override.yml"

# Summary
echo ""
echo "🎉 Setup Complete!"
echo "================="
echo ""
echo "📋 Configuration Summary:"
echo "  MySQL Host: $MYSQL_HOST"
echo "  MySQL User: $MYSQL_USER"
echo "  MySQL Database: $MYSQL_DATABASE"
echo "  MongoDB: ${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}"
echo "  Backend Port: $BACKEND_PORT"
echo "  Frontend Port: $FRONTEND_PORT"
echo "  Scraper Port: $SCRAPER_PORT"
echo ""
echo "🐳 Next Steps:"
echo "  1. Make sure MySQL is running on your host machine"
echo "  2. Make sure MongoDB is running on your host machine"
echo "  3. Run: docker-compose up --build"
echo ""
echo "🌐 Access URLs:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend API: http://localhost:$BACKEND_PORT"
echo "  Backend Health: http://localhost:$BACKEND_PORT/api/health"
echo ""

# Ask if user wants to start Docker now
echo ""
read -p "Would you like to start Docker containers now? (y/N): " START_NOW
if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🐳 Starting Docker containers..."
    docker-compose up --build
else
    echo ""
    echo "ℹ️  When ready, run: docker-compose up --build"
fi