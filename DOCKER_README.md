# 🚀 Quick Start - Docker Deployment

This project is fully dockerized for easy deployment on any system.

## ⚡ TL;DR (Too Long; Didn't Read)

```bash
# 1. Clone the repository
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git
cd Result_analyzer_MERN

# 2. Update .env with your passwords (optional but recommended)
notepad .env

# 3. Start everything
docker-compose up -d --build

# 4. Access the application
# Frontend: http://localhost
# Backend: http://localhost:5000
```

## 📋 Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (v2.0+)
- **Git**

## 📖 Detailed Setup Guide

**For System 1 (Development):**
- See main [README.md](README.md)

**For System 2 (Docker Deployment):**
- See [SYSTEM2_SETUP.md](SYSTEM2_SETUP.md) for complete step-by-step guide

**For AI/Developers (Docker Architecture):**
- See [DOCKER_SETUP.md](DOCKER_SETUP.md) for technical details

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│    MySQL     │
│  (React)     │     │  (Node.js)   │     │   Database   │
│  Port: 80    │     │  Port: 5000  │     │  Port: 3306  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                       
                            ├──────▶ MongoDB (Port: 27017)
                            │
                            └──────▶ Python Scraper (Port: 8001)
```

## 🎯 What's Included

- ✅ **5 Docker Containers:**
  - Frontend (React + Vite + Nginx)
  - Backend (Node.js + Express)
  - Python Scraper (Flask + Selenium + Tesseract)
  - MySQL Database (with auto-initialization)
  - MongoDB Database
  
- ✅ **Persistent Data:**
  - MySQL data stored in Docker volume
  - MongoDB data stored in Docker volume
  
- ✅ **Health Checks:**
  - All services monitored
  - Auto-restart on failure
  
- ✅ **Production Ready:**
  - Optimized builds
  - Security best practices
  - Nginx caching and compression

## 🔧 Configuration

### Environment Variables (.env)

The `.env` file contains all configuration:

```env
# MySQL
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=resana
MYSQL_USER=result_analyzer_user
MYSQL_PASSWORD=your_password

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRE=7d

# Node
NODE_ENV=production
```

⚠️ **Change default passwords before deploying to production!**

## 📦 Docker Files

- `docker-compose.yml` - Main orchestration file
- `frontend.Dockerfile` - Frontend build configuration
- `backend.Dockerfile` - Backend build configuration
- `scraper.Dockerfile` - Python scraper build configuration
- `nginx.conf` - Nginx web server configuration
- `.dockerignore` - Files excluded from Docker builds

## 🚀 Common Commands

### Start Services
```bash
docker-compose up -d --build
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Check Status
```bash
docker-compose ps
```

### Stop Services
```bash
docker-compose stop
```

### Restart Services
```bash
docker-compose restart
```

### Remove Everything (including data!)
```bash
docker-compose down -v
```

### Run Commands Inside Containers
```bash
# Backend shell
docker exec -it result_analyzer_backend sh

# MySQL client
docker exec -it result_analyzer_mysql mysql -u root -p

# Python scraper
docker exec -it result_analyzer_scraper python calculate_grades.py --semester 5
```

## 🔍 Verify Installation

Run the verification script:

```powershell
.\verify-docker-setup.ps1
```

Or manually check:

1. **Frontend:** http://localhost
2. **Backend API:** http://localhost:5000/api/health
3. **Scraper:** http://localhost:8001/health
4. **Container Status:** `docker-compose ps` (all should be "Up")

## 📊 Ports Used

| Service | Port | Access |
|---------|------|--------|
| Frontend | 80 | http://localhost |
| Backend | 5000 | http://localhost:5000 |
| Scraper | 8001 | http://localhost:8001 |
| MySQL | 3306 | localhost:3306 |
| MongoDB | 27017 | localhost:27017 |

## 💾 Backup & Restore

### Backup
```bash
# MySQL
docker exec result_analyzer_mysql mysqldump -u root -p resana > backup.sql

# MongoDB
docker exec result_analyzer_mongodb mongodump --archive > mongodb_backup.archive
```

### Restore
```bash
# MySQL
docker exec -i result_analyzer_mysql mysql -u root -p resana < backup.sql

# MongoDB
docker exec -i result_analyzer_mongodb mongorestore --archive < mongodb_backup.archive
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and stop the conflicting service
netstat -ano | findstr :80

# Or change port in docker-compose.yml
ports:
  - "8080:80"  # Changed from 80:80
```

### Container Won't Start
```bash
# Check logs
docker-compose logs [service_name]

# Rebuild without cache
docker-compose build --no-cache [service_name]
docker-compose up -d [service_name]
```

### Database Connection Failed
```bash
# Wait for health checks (30-60 seconds)
docker-compose ps

# Check database logs
docker-compose logs mysql-db
docker-compose logs mongodb
```

## 📚 Documentation

- **[SYSTEM2_SETUP.md](SYSTEM2_SETUP.md)** - Complete step-by-step setup guide
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Technical architecture and details
- **[README.md](README.md)** - Main project documentation

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all containers are running: `docker-compose ps`
3. Try restarting: `docker-compose restart`
4. Check [SYSTEM2_SETUP.md](SYSTEM2_SETUP.md) troubleshooting section

## ✨ Features

- 🔄 **Zero Configuration** - Works out of the box
- 🚀 **Fast Deployment** - Up and running in 5 minutes
- 🔒 **Secure** - Environment variables, no hardcoded credentials
- 📦 **Portable** - Run anywhere Docker runs
- 🔧 **Easy Updates** - Just `git pull` and `docker-compose up -d --build`
- 💾 **Data Persistence** - Databases survive container restarts
- 🏥 **Health Monitoring** - Auto-restart unhealthy containers

## 🎓 Default Users (Fresh Installation)

After first startup, run seed script:
```bash
docker exec -it result_analyzer_backend node scripts/seedUsers.js
```

Login credentials:
- **Admin:** admin@example.com / Admin@123
- **Teacher:** teacher@example.com / Teacher@123
- **Student:** student@example.com / Student@123

⚠️ **Change these passwords immediately after first login!**

## 🔐 Security Notes

For production deployment:
- ✅ Change all default passwords in `.env`
- ✅ Use strong JWT secret (32+ characters)
- ✅ Enable SSL/TLS (HTTPS)
- ✅ Set up firewall rules
- ✅ Regular backups
- ✅ Keep Docker images updated
- ✅ Never commit `.env` to Git

## 📝 License

[Your License Here]

## 👨‍💻 Author

Preetham M - [GitHub](https://github.com/Preetham-M2204)

---

**Happy Coding! 🚀**
