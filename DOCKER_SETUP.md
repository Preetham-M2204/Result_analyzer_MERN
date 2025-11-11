# Docker Setup Guide for Result Analyzer MERN Application

## Project Overview
Full-stack MERN application with Python scraper service for VTU result analysis.

**Tech Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Databases: MySQL + MongoDB
- Scraper: Python (with Tesseract OCR)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   MySQL DB      │
│   (React)       │     │   (Node.js)     │     │   (resana)      │
│   Port: 5173    │     │   Port: 5000    │     │   Port: 3306    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ├────▶ ┌─────────────────┐
                               │      │   MongoDB       │
                               │      │   Port: 27017   │
                               │      └─────────────────┘
                               │
                               └────▶ ┌─────────────────┐
                                      │ Python Scraper  │
                                      │   Port: 8001    │
                                      └─────────────────┘
```

## Docker Services

### 1. **frontend** - React Application
- **Base Image:** `node:18-alpine`
- **Build:** Vite build system
- **Port:** 5173 (development), 80 (production)
- **Dependencies:** package.json in `Result_Analyzer/`
- **Environment:** Connected to backend API

### 2. **backend** - Node.js API Server
- **Base Image:** `node:18-alpine`
- **Port:** 5000
- **Dependencies:** package.json in `backend/`
- **Environment Variables:**
  - MySQL connection (host: `mysql-db`, port: 3306)
  - MongoDB connection (host: `mongodb`, port: 27017)
  - JWT secrets
  - Scraper service URL

### 3. **python-scraper** - VTU Result Scraper Service
- **Base Image:** `python:3.11-slim`
- **Port:** 8001
- **Dependencies:** requirements.txt in `backend/scraper_service/`
- **System Packages:** 
  - Tesseract OCR
  - Chrome/Chromium (for Selenium)
  - ChromeDriver
- **Environment Variables:**
  - Database connections
  - Tesseract path

### 4. **mysql-db** - MySQL Database
- **Base Image:** `mysql:8.0`
- **Port:** 3306
- **Database:** `resana`
- **Initialization:** `backend/database_schema.sql`
- **Volumes:** Persistent data storage

### 5. **mongodb** - MongoDB Database
- **Base Image:** `mongo:7.0`
- **Port:** 27017
- **Volumes:** Persistent data storage

## File Structure for Docker

```
Result_analyzer_MERN/
├── docker-compose.yml                    # Main orchestration file
├── .dockerignore                         # Files to exclude from builds
├── .env.example                          # Environment template
├── .env                                  # Actual environment (git-ignored)
│
├── frontend.Dockerfile                   # Frontend container definition
├── backend.Dockerfile                    # Backend container definition
├── scraper.Dockerfile                    # Python scraper container definition
│
├── Result_Analyzer/                      # Frontend source
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│
├── backend/                              # Backend source
│   ├── package.json
│   ├── server.js
│   ├── database_schema.sql              # MySQL initialization
│   ├── src/
│   ├── scripts/
│   └── scraper_service/
│       ├── main.py
│       ├── requirements.txt
│       └── README.md
│
└── instructions/
    └── DOCKER_SETUP.md (this file)
```

## Dockerfiles to Create

### 1. **frontend.Dockerfile**

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY Result_Analyzer/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY Result_Analyzer/ ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. **backend.Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/ ./

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "server.js"]
```

### 3. **scraper.Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Set Tesseract path
ENV TESSERACT_CMD=/usr/bin/tesseract

# Copy requirements
COPY backend/scraper_service/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper source
COPY backend/scraper_service/ ./

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:8001/health || exit 1

# Start scraper service
CMD ["python", "main.py"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql-db:
    image: mysql:8.0
    container_name: result_analyzer_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/database_schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    networks:
      - result_analyzer_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: result_analyzer_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - result_analyzer_network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Python Scraper Service
  python-scraper:
    build:
      context: .
      dockerfile: scraper.Dockerfile
    container_name: result_analyzer_scraper
    restart: unless-stopped
    environment:
      MYSQL_HOST: mysql-db
      MYSQL_PORT: 3306
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      TESSERACT_CMD: /usr/bin/tesseract
    ports:
      - "8001:8001"
    depends_on:
      mysql-db:
        condition: service_healthy
    networks:
      - result_analyzer_network

  # Backend Node.js API
  backend:
    build:
      context: .
      dockerfile: backend.Dockerfile
    container_name: result_analyzer_backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      
      # MySQL Config
      MYSQL_HOST: mysql-db
      MYSQL_PORT: 3306
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      
      # MongoDB Config
      MONGODB_URI: mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/
      
      # JWT Config
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: ${JWT_EXPIRE}
      
      # Scraper Service
      SCRAPER_SERVICE_URL: http://python-scraper:8001
      
    ports:
      - "5000:5000"
    depends_on:
      mysql-db:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      python-scraper:
        condition: service_started
    networks:
      - result_analyzer_network

  # Frontend React Application
  frontend:
    build:
      context: .
      dockerfile: frontend.Dockerfile
    container_name: result_analyzer_frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:5000
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - result_analyzer_network

# Persistent volumes
volumes:
  mysql_data:
    name: result_analyzer_mysql_data
  mongodb_data:
    name: result_analyzer_mongodb_data

# Network
networks:
  result_analyzer_network:
    name: result_analyzer_network
    driver: bridge
```

## nginx.conf (for Frontend)

Create `nginx.conf` in project root:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Environment Variables (.env)

Create `.env` file in project root:

```env
# MySQL Configuration
MYSQL_ROOT_PASSWORD=your_root_password_here
MYSQL_DATABASE=resana
MYSQL_USER=result_analyzer_user
MYSQL_PASSWORD=your_mysql_password_here

# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_mongo_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_EXPIRE=7d

# Node Environment
NODE_ENV=production
```

## Docker Commands

### Build and Start All Services
```bash
docker-compose up -d --build
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f python-scraper
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes (CAUTION: Deletes all data)
```bash
docker-compose down -v
```

### Rebuild Specific Service
```bash
docker-compose up -d --build backend
```

### Execute Commands in Container
```bash
# Access MySQL
docker exec -it result_analyzer_mysql mysql -u root -p

# Access MongoDB
docker exec -it result_analyzer_mongodb mongosh -u admin -p

# Access Backend Shell
docker exec -it result_analyzer_backend sh

# Run Python Script
docker exec -it result_analyzer_scraper python calculate_grades.py --semester 5
```

### View Container Status
```bash
docker-compose ps
```

### Check Resource Usage
```bash
docker stats
```

## Database Initialization

### MySQL Schema
The `database_schema.sql` file is automatically executed when MySQL container starts for the first time.

### Migrate Existing Data
If you have existing data in a SQL dump:

```bash
# Copy dump file to container
docker cp your_dump.sql result_analyzer_mysql:/tmp/

# Import data
docker exec -it result_analyzer_mysql mysql -u root -p resana < /tmp/your_dump.sql
```

## Health Checks

Each service has health checks configured:

- **MySQL:** `mysqladmin ping`
- **MongoDB:** `mongosh ping`
- **Backend:** HTTP GET `/api/health`
- **Scraper:** HTTP GET `/health`

View health status:
```bash
docker-compose ps
```

## Troubleshooting

### Port Conflicts
If ports 80, 3306, 5000, 8001, or 27017 are already in use:

**Option 1:** Change ports in `docker-compose.yml`
```yaml
ports:
  - "8080:80"  # Changed from 80:80
```

**Option 2:** Stop conflicting services
```bash
# Windows
net stop mysql80
net stop MongoDB

# Linux/Mac
sudo systemctl stop mysql
sudo systemctl stop mongodb
```

### Container Won't Start
```bash
# Check logs
docker-compose logs [service_name]

# Rebuild without cache
docker-compose build --no-cache [service_name]

# Remove old containers
docker-compose down
docker system prune -a
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps

# Test MySQL connection
docker exec -it result_analyzer_mysql mysql -u root -p -e "SHOW DATABASES;"

# Test MongoDB connection
docker exec -it result_analyzer_mongodb mongosh --eval "db.adminCommand('ping')"
```

### Volume Permission Issues
```bash
# Linux/Mac: Fix permissions
sudo chown -R $USER:$USER ./volumes
```

## Production Deployment

### Security Best Practices

1. **Use Strong Passwords:**
   - Generate secure passwords: `openssl rand -base64 32`
   - Update all credentials in `.env`

2. **Enable Firewall:**
   ```bash
   # Allow only necessary ports
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

3. **SSL/TLS (HTTPS):**
   - Use Let's Encrypt with Certbot
   - Update nginx.conf for SSL

4. **Environment Variables:**
   - Never commit `.env` to Git
   - Use secrets management (Azure Key Vault, AWS Secrets Manager)

5. **Regular Backups:**
   ```bash
   # MySQL backup
   docker exec result_analyzer_mysql mysqldump -u root -p resana > backup_$(date +%Y%m%d).sql
   
   # MongoDB backup
   docker exec result_analyzer_mongodb mongodump --out=/tmp/backup
   docker cp result_analyzer_mongodb:/tmp/backup ./mongodb_backup_$(date +%Y%m%d)
   ```

### Monitoring
```bash
# Install monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Services: Prometheus, Grafana, cAdvisor
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)
```yaml
backend:
  # ... other config
  deploy:
    replicas: 3
```

### Load Balancer (Nginx)
Add nginx load balancer service in `docker-compose.yml`

## Updates and Maintenance

### Update Application Code
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Update Docker Images
```bash
# Pull latest base images
docker-compose pull

# Rebuild
docker-compose up -d --build
```

### Database Migrations
```bash
# Run migration scripts
docker exec -it result_analyzer_backend node scripts/migrate.js
```

## Testing Docker Setup

### 1. Verify All Services Running
```bash
docker-compose ps
# All should show "Up" and "healthy"
```

### 2. Test Backend API
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

### 3. Test Frontend
```bash
# Open browser
http://localhost
```

### 4. Test Scraper Service
```bash
curl http://localhost:8001/health
```

### 5. Test Database Connections
```bash
# MySQL
docker exec -it result_analyzer_mysql mysql -u result_analyzer_user -p -e "USE resana; SHOW TABLES;"

# MongoDB
docker exec -it result_analyzer_mongodb mongosh -u admin -p --eval "db.version()"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: docker-compose build
      
      - name: Run tests
        run: docker-compose run backend npm test
      
      - name: Deploy to production
        run: |
          # Your deployment script
          ssh user@server 'cd /app && git pull && docker-compose up -d --build'
```

## Backup and Restore

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)

# MySQL backup
docker exec result_analyzer_mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} resana > mysql_backup_${DATE}.sql

# MongoDB backup
docker exec result_analyzer_mongodb mongodump --archive > mongodb_backup_${DATE}.archive

# Compress
tar -czf backup_${DATE}.tar.gz mysql_backup_${DATE}.sql mongodb_backup_${DATE}.archive

# Upload to cloud storage (example: AWS S3)
# aws s3 cp backup_${DATE}.tar.gz s3://your-backup-bucket/
```

### Restore from Backup
```bash
# MySQL restore
docker exec -i result_analyzer_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} resana < mysql_backup_20231115.sql

# MongoDB restore
docker exec -i result_analyzer_mongodb mongorestore --archive < mongodb_backup_20231115.archive
```

## Quick Start Checklist

- [ ] Create all Dockerfiles (frontend, backend, scraper)
- [ ] Create docker-compose.yml
- [ ] Create nginx.conf
- [ ] Copy .env.example to .env and fill in values
- [ ] Ensure database_schema.sql exists
- [ ] Update .gitignore to exclude .env
- [ ] Update .dockerignore
- [ ] Run `docker-compose up -d --build`
- [ ] Test all services
- [ ] Import existing data if needed
- [ ] Set up backups
- [ ] Configure SSL for production

## Support and Documentation

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
- React Production Build: https://vitejs.dev/guide/build.html
