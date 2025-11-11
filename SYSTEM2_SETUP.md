# System 2 Setup Guide - Docker Deployment

## 📋 Prerequisites

Before you begin, ensure System 2 has:
- ✅ **Git** installed
- ✅ **Docker Desktop** installed (Windows/Mac) or **Docker Engine** (Linux)
- ✅ **Docker Compose** installed (usually comes with Docker Desktop)
- ✅ Internet connection for initial setup

## 🔍 Check Prerequisites

### 1. Verify Git is Installed
```powershell
git --version
# Should show: git version 2.x.x
```

If not installed, download from: https://git-scm.com/downloads

### 2. Verify Docker is Installed
```powershell
docker --version
# Should show: Docker version 24.x.x or higher

docker-compose --version
# Should show: Docker Compose version v2.x.x or higher
```

If not installed, download from: https://docs.docker.com/desktop/install/windows-install/

### 3. Ensure Docker is Running
```powershell
docker ps
# Should show list of containers (or empty list if none running)
# If you get an error, start Docker Desktop
```

## 📥 Step 1: Clone the Repository

```powershell
# Navigate to where you want to clone the project
cd D:\

# Clone the repository
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git

# Navigate into the project
cd Result_analyzer_MERN
```

## 🔐 Step 2: Configure Environment Variables

The `.env` file is already created with default values. **You should change the passwords for security:**

```powershell
# Open .env file in notepad
notepad .env
```

**Update these values:**
```env
# MySQL Configuration
MYSQL_ROOT_PASSWORD=YourStrongPassword123!
MYSQL_DATABASE=resana
MYSQL_USER=result_analyzer_user
MYSQL_PASSWORD=YourMySQLPassword456!

# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourMongoPassword789!

# JWT Configuration (use a random 32+ character string)
JWT_SECRET=your_random_32_character_secret_key_here_change_this
JWT_EXPIRE=7d

# Node Environment
NODE_ENV=production
```

**💡 Generate Strong Passwords:**
```powershell
# Option 1: Use PowerShell to generate random password
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Option 2: Use online generator (save locally, don't share)
# Visit: https://passwordsgenerator.net/
```

Save and close the file.

## 🗄️ Step 3: Prepare Database (Optional - If you have existing data)

### Option A: Fresh Installation (New Database)
**Skip this step** - Docker will create empty databases automatically.

### Option B: Import Existing Data

If you have a MySQL dump file from System 1:

```powershell
# Place your SQL dump in the project root
# For example: result_analyzer_backup.sql

# We'll import this after containers start (see Step 5)
```

## 🚀 Step 4: Build and Start Docker Containers

### 4.1 Stop Any Conflicting Services

If you have MySQL, MongoDB, or other services running on ports 80, 3306, 5000, 8001, or 27017:

```powershell
# Windows - Stop MySQL if installed locally
net stop MySQL80

# Windows - Stop MongoDB if installed locally
net stop MongoDB
```

### 4.2 Build and Start All Services

```powershell
# Make sure you're in the project root directory
cd D:\Result_analyzer_MERN

# Build and start all containers (this will take 5-10 minutes first time)
docker-compose up -d --build
```

**What this does:**
- ✅ Builds Docker images for Frontend, Backend, and Scraper
- ✅ Downloads MySQL and MongoDB images
- ✅ Creates and starts all 5 containers
- ✅ Creates persistent volumes for databases
- ✅ Sets up networking between containers

### 4.3 Monitor the Build Progress

```powershell
# Watch logs in real-time
docker-compose logs -f

# To stop watching logs, press Ctrl+C (containers keep running)
```

**Expected output:**
```
[+] Running 5/5
 ✔ Container result_analyzer_mysql      Started
 ✔ Container result_analyzer_mongodb    Started
 ✔ Container result_analyzer_scraper    Started
 ✔ Container result_analyzer_backend    Started
 ✔ Container result_analyzer_frontend   Started
```

## ✅ Step 5: Verify Installation

### 5.1 Check Container Status

```powershell
docker-compose ps
```

**All containers should show "Up" status:**
```
NAME                          STATUS                  PORTS
result_analyzer_backend       Up (healthy)            0.0.0.0:5000->5000/tcp
result_analyzer_frontend      Up                      0.0.0.0:80->80/tcp
result_analyzer_mysql         Up (healthy)            0.0.0.0:3306->3306/tcp
result_analyzer_mongodb       Up (healthy)            0.0.0.0:27017->27017/tcp
result_analyzer_scraper       Up                      0.0.0.0:8001->8001/tcp
```

### 5.2 Test Each Service

#### Test MySQL Database
```powershell
docker exec -it result_analyzer_mysql mysql -u result_analyzer_user -p
# Enter password: YourMySQLPassword456! (from .env)
# At MySQL prompt:
SHOW DATABASES;
USE resana;
SHOW TABLES;
exit;
```

#### Test MongoDB
```powershell
docker exec -it result_analyzer_mongodb mongosh -u admin -p
# Enter password: YourMongoPassword789! (from .env)
# At MongoDB prompt:
db.adminCommand('ping')
exit
```

#### Test Backend API
```powershell
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

Or open in browser: http://localhost:5000/api/health

#### Test Scraper Service
```powershell
curl http://localhost:8001/health
# Should return health status
```

Or open in browser: http://localhost:8001/health

#### Test Frontend
**Open browser and go to:**
```
http://localhost
```

You should see the Result Analyzer application!

## 📊 Step 6: Import Existing Data (If Applicable)

### Import MySQL Dump

```powershell
# Copy your SQL dump into the MySQL container
docker cp result_analyzer_backup.sql result_analyzer_mysql:/tmp/

# Import the data
docker exec -it result_analyzer_mysql mysql -u root -p resana < /tmp/result_analyzer_backup.sql
# Enter root password from .env

# Or run inside container:
docker exec -it result_analyzer_mysql bash
mysql -u root -p resana < /tmp/result_analyzer_backup.sql
exit
```

### Verify Data Import
```powershell
docker exec -it result_analyzer_mysql mysql -u result_analyzer_user -p -e "USE resana; SELECT COUNT(*) FROM students;"
# Should show number of students
```

## 🎯 Step 7: Create Admin User (If Fresh Installation)

```powershell
# Access backend container
docker exec -it result_analyzer_backend sh

# Run seed script to create default users
node scripts/seedUsers.js

# Exit container
exit
```

**Default credentials created:**
- Admin: admin@example.com / Admin@123
- Teacher: teacher@example.com / Teacher@123
- Student: student@example.com / Student@123

**⚠️ Change these passwords immediately after first login!**

## 🔧 Common Issues and Solutions

### Issue 1: Port Already in Use

**Error:** "Bind for 0.0.0.0:80 failed: port is already allocated"

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :80

# Kill the process (replace PID with actual process ID)
taskkill /PID [PID] /F

# Or change port in docker-compose.yml
# Change "80:80" to "8080:80" for frontend
```

### Issue 2: Container Fails to Start

**Solution:**
```powershell
# Check logs for specific container
docker-compose logs backend

# Restart specific container
docker-compose restart backend

# Rebuild without cache
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Issue 3: Database Connection Failed

**Solution:**
```powershell
# Check if database containers are healthy
docker-compose ps

# If not healthy, check logs
docker-compose logs mysql-db
docker-compose logs mongodb

# Wait for health checks to pass (can take 30-60 seconds)
```

### Issue 4: Frontend Shows "Cannot connect to backend"

**Solution:**
```powershell
# Ensure backend is running and healthy
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Verify backend responds
curl http://localhost:5000/api/health
```

### Issue 5: Permission Denied on Linux/Mac

**Solution:**
```bash
# Fix Docker socket permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix volume permissions
sudo chown -R $USER:$USER ./
```

## 🛠️ Useful Docker Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f python-scraper

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Restart Services
```powershell
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services
```powershell
# Stop all (data persists in volumes)
docker-compose stop

# Stop specific service
docker-compose stop backend
```

### Start Services
```powershell
# Start all (if stopped)
docker-compose start

# Start specific service
docker-compose start backend
```

### Completely Remove Everything
```powershell
# CAUTION: This deletes all data!
docker-compose down -v

# Then rebuild
docker-compose up -d --build
```

### Execute Commands in Containers
```powershell
# Access backend shell
docker exec -it result_analyzer_backend sh

# Run Python script in scraper
docker exec -it result_analyzer_scraper python calculate_grades.py --semester 5

# Access MySQL
docker exec -it result_analyzer_mysql mysql -u root -p

# Access MongoDB
docker exec -it result_analyzer_mongodb mongosh -u admin -p
```

### Check Resource Usage
```powershell
# See CPU/Memory usage
docker stats

# See disk usage
docker system df
```

## 🔄 Updating the Application

### Pull Latest Changes from Git
```powershell
# Stop containers
docker-compose stop

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Update Specific Service
```powershell
# Only rebuild backend
docker-compose build backend
docker-compose up -d backend

# Only rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

## 💾 Backup and Restore

### Backup Databases
```powershell
# MySQL backup
docker exec result_analyzer_mysql mysqldump -u root -p resana > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# MongoDB backup
docker exec result_analyzer_mongodb mongodump --archive > mongodb_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").archive
```

### Restore from Backup
```powershell
# MySQL restore
docker exec -i result_analyzer_mysql mysql -u root -p resana < backup_20241111_143000.sql

# MongoDB restore
docker exec -i result_analyzer_mongodb mongorestore --archive < mongodb_backup_20241111_143000.archive
```

## 🌐 Access URLs

After successful setup, access these URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost | Main application UI |
| **Backend API** | http://localhost:5000 | REST API endpoints |
| **API Health Check** | http://localhost:5000/api/health | Backend status |
| **Scraper Service** | http://localhost:8001 | Python scraper API |
| **Scraper Health** | http://localhost:8001/health | Scraper status |
| **MySQL** | localhost:3306 | Database connection |
| **MongoDB** | localhost:27017 | Database connection |

## 📝 Default Ports Summary

- **80** - Frontend (Nginx)
- **3306** - MySQL Database
- **5000** - Backend API (Node.js)
- **8001** - Python Scraper Service
- **27017** - MongoDB Database

## 🎓 Next Steps

1. ✅ **Login to Application**
   - Go to http://localhost
   - Use default admin credentials (or your created user)

2. ✅ **Change Default Passwords**
   - Login as admin
   - Go to Settings/Profile
   - Update password

3. ✅ **Import Students Data**
   - Use HOD dashboard to bulk import students
   - Or use scraper to fetch from VTU

4. ✅ **Test Scraper**
   - Go to HOD/Admin dashboard
   - Test scraping results for a semester

5. ✅ **Set Up Backups**
   - Create automated backup script
   - Schedule regular backups

6. ✅ **Monitor Logs**
   - Regularly check `docker-compose logs`
   - Monitor for errors or warnings

## 📞 Support

If you encounter issues:

1. **Check logs first:**
   ```powershell
   docker-compose logs -f
   ```

2. **Verify all containers are running:**
   ```powershell
   docker-compose ps
   ```

3. **Try restarting:**
   ```powershell
   docker-compose restart
   ```

4. **Last resort - clean rebuild:**
   ```powershell
   docker-compose down
   docker-compose up -d --build
   ```

## ✨ Success Checklist

- [ ] Docker Desktop is running
- [ ] All 5 containers are "Up" and "healthy"
- [ ] Frontend loads at http://localhost
- [ ] Backend API responds at http://localhost:5000/api/health
- [ ] Can login to the application
- [ ] Scraper service is accessible
- [ ] Databases contain data (if imported)
- [ ] No errors in `docker-compose logs`

**🎉 Congratulations! Your Result Analyzer is now running on System 2!**

---

## 📚 Additional Resources

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- MySQL in Docker: https://hub.docker.com/_/mysql
- MongoDB in Docker: https://hub.docker.com/_/mongo
- Nginx Configuration: https://nginx.org/en/docs/

## 🔒 Security Notes for Production

If deploying to production server:

1. **Use strong passwords** - Generate with password manager
2. **Enable firewall** - Only allow necessary ports
3. **Set up SSL/TLS** - Use Let's Encrypt for HTTPS
4. **Regular backups** - Automated daily backups
5. **Monitor logs** - Set up log aggregation
6. **Update regularly** - Keep Docker images updated
7. **Use secrets management** - Don't commit .env to Git
8. **Limit access** - Use VPN or IP whitelisting
