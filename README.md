# VTU Results Analyzer - MERN Stack Application

A comprehensive web application for analyzing VTU (Visvesvaraya Technological University) student results with automated scraping, SGPA/CGPA calculation, and role-based dashboards.

## Overview

This project is a full-stack MERN (MySQL + Express + React + Node.js) application that automates the collection and analysis of VTU examination results. It features intelligent web scraping, automatic grade calculation, and specialized dashboards for students, teachers, HODs, and administrators.

## Features

### Core Functionality
- **Automated Results Scraping** - Scrapes VTU and Autonomous results using intelligent multi-threaded scrapers
- **SGPA/CGPA Calculation** - Automatic calculation of semester and cumulative GPAs with letter grades
- **Role-Based Access Control** - Four distinct user roles with specialized dashboards
- **Teacher Assignment System** - Dynamic subject-teacher mapping with batch/semester filtering
- **Retry Mechanism** - Smart retry for failed USN scraping with minimal resource usage
- **Real-Time Progress Tracking** - Live updates during scraping operations

### User Roles & Dashboards

#### Student Dashboard
- View personal profile with CGPA and rank
- Semester-wise results display
- SGPA trend visualization
- Subject performance analytics
- Downloadable marksheets

#### Teacher Dashboard
- View assigned subjects and students
- Student performance analysis by subject
- Grade distribution statistics
- Sortable and searchable student lists

#### HOD Dashboard
- College-wide performance overview
- Top performers leaderboard
- Subject analytics across sections
- Section comparison reports
- Excel export functionality

#### Admin Dashboard
- User management (CRUD operations)
- Scraper control interface
- Teacher-subject assignment management
- System monitoring and logs
- Batch processing capabilities

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** Context API
- **UI Components:** Material-UI
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Styling:** CSS Modules

### Backend
- **Runtime:** Node.js with Express.js
- **Authentication:** JWT (jsonwebtoken)
- **Password Security:** bcrypt
- **Databases:**
  - MongoDB - User authentication and sessions
  - MySQL - Student data, results, and analytics
- **API Architecture:** RESTful API with FastAPI microservice
- **Validation:** express-validator

### Scraping Services
- **Python Scrapers:**
  - VTU Results Scraper (Selenium + BeautifulSoup + Tesseract OCR)
  - Autonomous Results Scraper (Selenium + ChromeDriver)
- **API Service:** FastAPI (port 8000)
- **Multi-threading:** ThreadPoolExecutor for concurrent scraping
- **Session Management:** In-memory progress tracking

## Architecture

```
┌─────────────────────────────────────┐
│  Frontend (React - Port 5173)      │
└──────────────┬──────────────────────┘
               │ HTTP + JWT
┌──────────────▼──────────────────────┐
│  Backend (Express - Port 3000)     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   MongoDB   │  │    MySQL     │ │
│  │   (Auth)    │  │   (resana)   │ │
│  │  - users    │  │  - students  │ │
│  │  - sessions │  │  - subjects  │ │
│  └─────────────┘  │  - results   │ │
│                   └──────────────┘ │
│  ┌─────────────────────────────┐  │
│  │  FastAPI (Port 8000)        │  │
│  │  - Scraper coordination     │  │
│  └──────────┬──────────────────┘  │
│             │                      │
│  ┌──────────▼──────────────────┐  │
│  │  Python Scrapers            │  │
│  │  - ultimate_scraper.py      │  │
│  │  - AUTONOMOUS_scrapper.py   │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- MySQL Server
- MongoDB
- Tesseract OCR (for VTU scraper)
- Chrome/Chromium (for Autonomous scraper)

### Clone Repository
```bash
git clone https://github.com/Preetham-M2204/Result_analyzer_MERN.git
cd Result_analyzer_MERN
```

### Backend Setup
```bash
cd backend

# Install Node.js dependencies
npm install

# Install Python dependencies
cd scripts
pip install -r requirements.txt
cd ..

# Install FastAPI service dependencies
cd scraper_service
pip install -r requirements.txt
cd ..

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Setup MySQL database
mysql -u root -p < database_schema.sql

# Start backend server
npm start
```

### Frontend Setup
```bash
cd Result_Analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Scraper Service Setup
```bash
cd backend/scraper_service

# Install Tesseract OCR (Windows)
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Install to: C:\Program Files\Tesseract-OCR\

# Start FastAPI service
python main.py
```

## Configuration

### Database Configuration

**MySQL** (`backend/scripts/db_config.py`):
```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_password',
    'database': 'resana'
}
```

**MongoDB** (`backend/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/vtu_results
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

### Default Users

#### Admin
- Email: `admin@gmail.com`
- Password: `admin123`

#### Student
- USN: `1BI23IS082`
- Password: Same as USN

## Usage

### Starting the Application

**Option 1: Automated (Windows)**
```powershell
cd backend
.\start-services.ps1
```

**Option 2: Manual (Separate Terminals)**
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: FastAPI
cd backend/scraper_service
python main.py

# Terminal 3: Frontend
cd Result_Analyzer
npm run dev
```

### Scraping Results

1. Login as Admin
2. Navigate to Scraper tab
3. Select scraper type (VTU or Autonomous)
4. Configure parameters:
   - Results URL
   - Semester
   - Mode (Single USN or Batch Year)
   - Workers (parallel threads)
5. Click "Start Scraper"
6. Monitor real-time progress
7. View failed USNs and retry if needed

### Calculating SGPA/CGPA

**Automatic** (after scraping):
Grades are calculated automatically when using FastAPI scraper service.

**Manual** (for existing data):
```bash
cd backend/scripts
python migrate_existing_data.py
```

### Managing Teachers

1. Login as Admin
2. Go to User Management → Create Teacher users
3. Navigate to Teachers tab
4. Select Batch → Semester → Section
5. Choose Teacher and assign subjects

## API Documentation

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

#### Scraper
- `POST /api/scraper/vtu/start` - Start VTU scraper
- `POST /api/scraper/autonomous/start` - Start Autonomous scraper
- `GET /api/scraper/progress/:sessionId` - Get scraping progress
- `POST /api/scraper/stop/:sessionId` - Stop scraper
- `POST /api/scraper/retry/:sessionId` - Retry failed USNs

#### Student
- `GET /api/student/profile` - Get student profile
- `GET /api/student/results/:semester` - Get semester results
- `GET /api/student/sgpa/:semester` - Get SGPA
- `GET /api/student/cgpa` - Get CGPA

#### Teacher
- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/subjects` - Get subjects by batch/semester
- `POST /api/teachers/assign` - Assign subjects to teacher
- `DELETE /api/teachers/assignment` - Remove assignment

#### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

For complete API documentation, see [instructions/SCRAPER_INTEGRATION_COMPLETE.md](instructions/SCRAPER_INTEGRATION_COMPLETE.md)

## Database Schema

### Core Tables

**student_details**
- Primary student information (USN, name, batch, section, scheme, CGPA)

**subjects**
- Subject catalog with codes, names, credits, and schemes

**results**
- Individual subject results with marks and grades

**student_semester_summary**
- Semester-wise SGPA, percentage, and class grades

**teachers**
- Teacher information and credentials

**teacher_subject_assignments**
- Subject-teacher mappings with batch/section filters

For detailed schema, see [backend/database_schema.sql](backend/database_schema.sql)

## Grade Calculation Logic

### Letter Grades (based on percentage)
- **O (Outstanding)**: 90-100% → 10 points
- **A+ (Excellent)**: 80-89% → 9 points
- **A (Very Good)**: 70-79% → 8 points
- **B+ (Good)**: 60-69% → 7 points
- **B (Above Average)**: 50-59% → 6 points
- **C (Average)**: 40-49% → 5 points
- **P (Pass)**: 35-39% → 4 points
- **F (Fail)**: <35% → 0 points

### SGPA Calculation
```
SGPA = Σ(credits × grade_points) / Σ(credits)
```

### CGPA Calculation
```
CGPA = Mean of all semester SGPAs
```

### Class Grades
- **FCD (First Class with Distinction)**: SGPA ≥ 7.75
- **FC (First Class)**: SGPA ≥ 6.25
- **SC (Second Class)**: SGPA ≥ 5.00
- **P (Pass)**: SGPA ≥ 4.00
- **F (Fail)**: SGPA < 4.00 or any failed subject

For detailed calculation logic, see [instructions/SGPA_CGPA_CALCULATION.md](instructions/SGPA_CGPA_CALCULATION.md)

## Project Structure

```
Result_analyzer_MERN/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and JWT configuration
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth and validation
│   │   ├── models/          # Data models
│   │   └── routes/          # API endpoints
│   ├── scripts/             # Python utilities and scrapers
│   ├── scraper_service/     # FastAPI microservice
│   ├── database_schema.sql  # MySQL schema
│   ├── package.json
│   └── server.js
├── Result_Analyzer/         # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── api/             # API client functions
│   │   ├── context/         # React context providers
│   │   ├── types/           # TypeScript type definitions
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── instructions/            # Detailed documentation
└── README.md
```

## Documentation

Comprehensive guides are available in the `instructions/` folder:

### Setup Guides
- [BUILD_PLAN.md](instructions/BUILD_PLAN.md) - Complete build specifications
- [QUICK_SGPA_SETUP.md](instructions/QUICK_SGPA_SETUP.md) - Quick SGPA/CGPA setup
- [MIGRATION_GUIDE.md](instructions/MIGRATION_GUIDE.md) - Database migration guide

### Feature Guides
- [SCRAPER_INTEGRATION_COMPLETE.md](instructions/SCRAPER_INTEGRATION_COMPLETE.md) - Scraper API documentation
- [FRONTEND_SCRAPER_GUIDE.md](instructions/FRONTEND_SCRAPER_GUIDE.md) - Frontend scraper UI guide
- [RETRY_FEATURE_GUIDE.md](instructions/RETRY_FEATURE_GUIDE.md) - Retry mechanism guide
- [TEACHER_ASSIGNMENT_GUIDE.md](instructions/TEACHER_ASSIGNMENT_GUIDE.md) - Teacher assignment system
- [SGPA_CGPA_CALCULATION.md](instructions/SGPA_CGPA_CALCULATION.md) - Grade calculation details

### Development Guidelines
- [RULES_FOR_DEVELOPMENT.md](instructions/RULES_FOR_DEVELOPMENT.md) - Coding standards and UI guidelines

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Integration Tests
```bash
cd backend
.\test-integration.ps1  # Windows PowerShell
```

### Verify Setup
```bash
cd backend
.\verify-integration.ps1  # Windows PowerShell
```

## Troubleshooting

### Common Issues

**Tesseract OCR not found**
```bash
# Install Tesseract OCR for Windows
# Download: https://github.com/UB-Mannheim/tesseract/wiki
# Default path: C:\Program Files\Tesseract-OCR\tesseract.exe
```

**FastAPI service not responding**
```bash
# Check service status
curl http://localhost:8000/health

# Restart service
cd backend/scraper_service
python main.py
```

**Database connection failed**
```bash
# Verify MySQL is running
mysql -u root -p

# Check database exists
SHOW DATABASES;
USE resana;
```

**MongoDB connection error**
```bash
# Verify MongoDB is running
mongosh

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/vtu_results
```

For detailed troubleshooting, see individual guides in the `instructions/` folder.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the coding standards in [RULES_FOR_DEVELOPMENT.md](instructions/RULES_FOR_DEVELOPMENT.md)
- No emojis in code or UI (professional appearance)
- Use TypeScript for type safety
- Write meaningful commit messages
- Test thoroughly before submitting PR

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- VTU (Visvesvaraya Technological University) for the results portal
- Bangalore Institute of Technology for the autonomous results system
- All contributors who have helped with testing and feedback

## Contact

**Project Maintainer:** Preetham M  
**GitHub:** [@Preetham-M2204](https://github.com/Preetham-M2204)  
**Repository:** [Result_analyzer_MERN](https://github.com/Preetham-M2204/Result_analyzer_MERN)

## Project Status

✅ **Production Ready** - All core features implemented and tested

### Recent Updates
- ✅ Automated SGPA/CGPA calculation
- ✅ FastAPI scraper integration
- ✅ Teacher assignment system
- ✅ Retry mechanism for failed USNs
- ✅ Year-based scheme auto-detection
- ✅ Professional UI/UX improvements

### Roadmap
- [ ] PDF marksheet generation
- [ ] Email notifications for scraper completion
- [ ] Advanced analytics and visualizations
- [ ] Parent portal access
- [ ] Mobile responsive improvements
- [ ] Docker containerization

---

**Built with ❤️ for educational institutions**
