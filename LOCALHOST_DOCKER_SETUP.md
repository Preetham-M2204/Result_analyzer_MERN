# 🚀 Localhost Database + Docker Setup

## What This Setup Does

- ✅ MySQL runs on **localhost:3306** (your PC)
- ✅ MongoDB runs on **localhost:27017** (your PC)
- ✅ Frontend, Backend, Scraper run in **Docker containers**
- ✅ Docker containers connect to your localhost databases using `host.docker.internal`

## Prerequisites

1. **MySQL running locally**
   - Port: 3306
   - Database: `resana`
   - User: `root`
   - Password: `Preetham@123@`

2. **MongoDB running locally**
   - Port: 27017
   - Database: `vtu_auth`

3. **Docker Desktop installed**

## Quick Start

```powershell
# 1. Make sure MySQL & MongoDB are running
# Check MySQL
mysql -u root -p -e "SHOW DATABASES;"

# Check MongoDB
mongosh --eval "db.version()"

# 2. Clone repo (anywhere you want)
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git
cd Result_analyzer_MERN

# 3. Run Docker
docker-compose up -d --build

# 4. Access
# Frontend: http://localhost
# Backend: http://localhost:5000
```

## Migration to New Computer

### Step 1: Export Your Databases

**On your current PC:**

```powershell
# Export MySQL
mysqldump -u root -p resana > resana_backup.sql

# Export MongoDB
mongodump --db vtu_auth --out mongo_backup
```

### Step 2: Setup New Computer

**On the new computer:**

```powershell
# 1. Install MySQL & MongoDB locally
# 2. Import your data

# Import MySQL
mysql -u root -p
CREATE DATABASE resana;
exit;
mysql -u root -p resana < resana_backup.sql

# Import MongoDB
mongorestore --db vtu_auth mongo_backup/vtu_auth

# 3. Clone & Run Docker
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git
cd Result_analyzer_MERN
docker-compose up -d --build
```

## Troubleshooting

### "Can't connect to MySQL"

```powershell
# Make sure MySQL is running
net start MySQL80

# Test connection
mysql -u root -p -e "SHOW DATABASES;"
```

### "Can't connect to MongoDB"

```powershell
# Make sure MongoDB is running
net start MongoDB

# Test connection
mongosh --eval "db.version()"
```

### "Backend can't reach database"

Docker containers use `host.docker.internal` to access localhost.

On **Linux**, you may need to add this to `/etc/hosts`:
```
127.0.0.1 host.docker.internal
```

Or use `172.17.0.1` (Docker bridge gateway) instead.

## Configuration

Database credentials are hardcoded in `docker-compose.yml`:

```yaml
MYSQL_HOST: host.docker.internal
MYSQL_USER: root
MYSQL_PASSWORD: Preetham@123@
MYSQL_DATABASE: resana
MONGODB_URI: mongodb://host.docker.internal:27017/vtu_auth
```

To change, edit `docker-compose.yml` and rebuild:
```powershell
docker-compose up -d --build
```

## Benefits of This Setup

✅ **Keep your existing databases** - No need to migrate  
✅ **Easy backups** - Use familiar MySQL/MongoDB tools  
✅ **Direct access** - Can use MySQL Workbench, MongoDB Compass  
✅ **Fast development** - Database changes don't require Docker rebuild  
✅ **Portable frontend/backend** - Docker handles application, not data  

## Full Docker Setup (Alternative)

If you want databases in Docker too, see `DOCKER_SETUP.md` for complete containerization.

---

**Current Setup:** Localhost databases + Docker apps  
**Works on:** Windows, Mac, Linux (with host.docker.internal support)
