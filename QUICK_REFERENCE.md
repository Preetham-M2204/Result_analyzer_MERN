# 🎯 System 2 Quick Reference Card

## ⚡ Super Quick Setup (5 Commands)

```powershell
# 1. Clone
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git
cd Result_analyzer_MERN

# 2. Configure (Optional but recommended)
notepad .env

# 3. Start
docker-compose up -d --build

# 4. Verify
docker-compose ps

# 5. Access
start http://localhost
```

## 📋 Essential Commands

### Start/Stop
```powershell
docker-compose up -d --build    # Start all services
docker-compose stop             # Stop all services
docker-compose restart          # Restart all services
docker-compose down             # Stop and remove containers
```

### Monitor
```powershell
docker-compose ps               # Check status
docker-compose logs -f          # View logs (all)
docker-compose logs -f backend  # View logs (specific)
docker stats                    # Resource usage
```

### Access Containers
```powershell
docker exec -it result_analyzer_backend sh           # Backend shell
docker exec -it result_analyzer_mysql mysql -u root -p   # MySQL
docker exec -it result_analyzer_mongodb mongosh -u admin -p  # MongoDB
```

### Troubleshoot
```powershell
docker-compose logs [service]   # Check logs
docker-compose restart [service] # Restart service
docker-compose build --no-cache [service]  # Rebuild
```

## 🌐 Access URLs

| What | URL |
|------|-----|
| **Application** | http://localhost |
| **Backend API** | http://localhost:5000 |
| **API Health** | http://localhost:5000/api/health |
| **Scraper** | http://localhost:8001 |
| **MySQL** | localhost:3306 |
| **MongoDB** | localhost:27017 |

## 🔑 Default Credentials (.env)

```env
MySQL User: result_analyzer_user
MySQL Pass: ResultAnalyzer@2024
Mongo User: admin
Mongo Pass: MongoAdmin@2024
```

⚠️ **Change these in .env before production!**

## 🐛 Quick Fixes

### Port in use?
```powershell
net stop MySQL80
net stop MongoDB
```

### Container failing?
```powershell
docker-compose logs [service_name]
docker-compose restart [service_name]
```

### Database not ready?
Wait 30-60 seconds for health checks:
```powershell
docker-compose ps  # Check if "healthy"
```

### Frontend can't reach backend?
```powershell
docker-compose restart backend
curl http://localhost:5000/api/health
```

## 💾 Backup

```powershell
# MySQL
docker exec result_analyzer_mysql mysqldump -u root -p resana > backup.sql

# MongoDB
docker exec result_analyzer_mongodb mongodump --archive > mongodb.archive
```

## 🔄 Update

```powershell
git pull origin main
docker-compose up -d --build
```

## 📚 Full Documentation

- **SYSTEM2_SETUP.md** - Complete step-by-step guide
- **DOCKER_SETUP.md** - Technical architecture
- **DOCKERIZATION_SUMMARY.md** - Overview

## ✅ Success Check

All should be ✓:
- [ ] 5 containers "Up" (docker-compose ps)
- [ ] http://localhost loads
- [ ] http://localhost:5000/api/health returns {"status":"ok"}
- [ ] No errors in logs (docker-compose logs -f)

## 🆘 Help

Stuck? Check logs:
```powershell
docker-compose logs -f
```

Still stuck? See SYSTEM2_SETUP.md Troubleshooting section.

---
**Print this page for quick reference!**
