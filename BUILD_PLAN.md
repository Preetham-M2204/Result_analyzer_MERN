# VTU Results Analyzer - Build Plan
## Updated Specifications for Implementation

**Last Updated:** November 1, 2025

---

## 🎯 Tech Stack (CONFIRMED)

### Frontend
- **Framework:** React 18 (Vite setup already done in `Result_Analyzer/`)
- **UI Library:** Material-UI / Ant Design / Chakra UI (TBD)
- **Routing:** React Router v6
- **State Management:** Context API / Redux Toolkit (TBD)
- **Charts:** Recharts / Chart.js
- **HTTP Client:** Axios
- **Styling:** CSS Modules / Styled Components
- **Theme:** Green Dark (inspired by Bangalore Institute of Technology)

### Backend
- **Framework:** Node.js + Express.js
- **Auth Database:** SQLite (development) → MongoDB (production/Docker)
- **Data Database:** MySQL (existing `resana` database)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** express-validator
- **Scraping:** Python scripts (child_process to execute)
- **File Export:** exceljs, pdfkit

### Database Architecture
```
┌─────────────────────────────────────┐
│     Frontend (React - Port 5173)   │
└──────────────┬──────────────────────┘
               │ HTTP + JWT
┌──────────────▼──────────────────────┐
│  Backend (Express - Port 3000)     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   SQLite    │  │    MySQL     │ │
│  │   (Auth)    │  │   (resana)   │ │
│  │  - users    │  │  - students  │ │
│  │  - sessions │  │  - subjects  │ │
│  └─────────────┘  │  - results   │ │
│                   └──────────────┘ │
│  ┌─────────────────────────────┐  │
│  │  Python Scraper (spawned)   │  │
│  │  - ultimate_scraper.py      │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 👥 Seed Users (PRODUCTION DATA)

### 1. Student
```json
{
  "usn": "1BI23IS082",
  "email": "mypt1991@gmail.com",
  "password": "1BI23IS082",
  "role": "STUDENT",
  "mustChangePassword": true
}
```
**Notes:**
- Name will be fetched from MySQL `student_details` table
- On first login: prompt for missing data (section, gender, etc.)

### 2. Teacher
```json
{
  "teacherId": "T010",
  "email": "abc@gmail.com",
  "password": "T010",
  "role": "TEACHER",
  "name": "Faculty Name",
  "mustChangePassword": true,
  "assignedSubjects": ["SUBJECT_CODE_HERE"]
}
```
**Notes:**
- Assign 1 subject for Phase 1
- Name is editable by admin
- Subject assignment via admin panel

### 3. HOD
```json
{
  "hodId": "T001",
  "email": "examplemail@gmail.com",
  "password": "T001",
  "role": "HOD",
  "name": "HOD Name",
  "mustChangePassword": true
}
```
**Notes:**
- HOD is a special teacher with elevated permissions
- Can view all students, all subjects

### 4. Admin
```json
{
  "adminId": "ADMIN001",
  "email": "admin@gmail.com",
  "password": "admin123",
  "role": "ADMIN",
  "name": "System Administrator",
  "mustChangePassword": true
}
```
**Notes:**
- Master control
- Can manage all users
- Can trigger scraping

---

## 📁 Folder Structure

```
scrapper/
├── Result_Analyzer/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   ├── Student/
│   │   │   ├── Teacher/
│   │   │   ├── HOD/
│   │   │   ├── Admin/
│   │   │   └── Shared/
│   │   ├── contexts/         # Auth context
│   │   ├── hooks/
│   │   ├── services/         # API calls
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── logo.png          # College logo (to be provided)
│   └── package.json
│
├── backend/                   # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js         # MySQL + SQLite connection
│   │   │   └── auth.js       # JWT config
│   │   ├── models/
│   │   │   ├── User.js       # SQLite schema
│   │   │   └── mysql.js      # MySQL query helpers
│   │   ├── routes/
│   │   │   ├── auth.js       # Login, logout, change password
│   │   │   ├── student.js    # Student APIs
│   │   │   ├── teacher.js    # Teacher APIs
│   │   │   ├── hod.js        # HOD APIs
│   │   │   └── admin.js      # Admin APIs
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT verification
│   │   │   └── roleCheck.js  # Role-based access
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── scraper.js    # Python scraper integration
│   │   │   └── export.js     # Excel/PDF export
│   │   ├── utils/
│   │   └── server.js         # Entry point
│   ├── auth.db               # SQLite database (auto-created)
│   ├── package.json
│   └── .env                  # Environment variables
│
├── ultimate_scraper.py       # Python scraper
├── db_config.py              # DB connection
├── generate_excel.py         # Excel export
├── database_schema.sql       # MySQL schema
└── BUILD_PLAN.md             # This file
```

---

## 🚀 Implementation Plan (RAPID - No Weekly Split)

### Phase 1: Foundation

#### Step 1: Backend Setup (30 min)
- [x] Create `backend/` folder
- [ ] Initialize npm (`npm init -y`)
- [ ] Install dependencies:
  - express, cors, dotenv
  - jsonwebtoken, bcrypt
  - better-sqlite3 (for auth DB)
  - mysql2 (for data DB)
  - express-validator
- [ ] Create folder structure
- [ ] Setup `.env` file

#### Step 2: Database Setup (30 min)
- [ ] Create SQLite schema for users table
- [ ] Connect to existing MySQL `resana` database
- [ ] Create seed script to insert 4 users
- [ ] Verify connections

#### Step 3: Authentication (1 hour)
- [ ] Create User model (SQLite)
- [ ] Build auth middleware (JWT verification)
- [ ] Build role-check middleware
- [ ] Create auth routes:
  - POST `/api/auth/login`
  - POST `/api/auth/logout`
  - POST `/api/auth/change-password`
  - GET `/api/auth/me` (get current user)

#### Step 4: Student Backend (1 hour)
- [ ] Create student routes:
  - GET `/api/student/profile` (fetch from MySQL)
  - GET `/api/student/results/:semester`
  - GET `/api/student/results/all`
  - GET `/api/student/sgpa/:semester`
  - GET `/api/student/cgpa`
  - GET `/api/student/rank`
  - POST `/api/student/update-profile` (section, gender, etc.)
- [ ] Test with Postman/Thunder Client

#### Step 5: Teacher Backend (1 hour)
- [ ] Create teacher routes:
  - GET `/api/teacher/subjects` (assigned subjects)
  - GET `/api/teacher/students/:subjectCode`
  - GET `/api/teacher/performance/:subjectCode`

#### Step 6: HOD Backend (1.5 hours)
- [ ] Create HOD routes:
  - GET `/api/hod/overview` (college stats)
  - GET `/api/hod/top-performers?limit=10`
  - GET `/api/hod/subject-analytics?semester=3`
  - GET `/api/hod/section-comparison?semester=3`
  - POST `/api/hod/export` (Excel export)

#### Step 7: Admin Backend (1.5 hours)
- [ ] Create admin routes:
  - GET `/api/admin/users` (all users)
  - POST `/api/admin/users` (add user)
  - PUT `/api/admin/users/:id` (edit user)
  - DELETE `/api/admin/users/:id` (delete user)
  - POST `/api/admin/scrape` (trigger scraping)
  - GET `/api/admin/scrape/logs` (scraping logs)

---

### Phase 2: Frontend

#### Step 8: Frontend Setup (30 min)
- [x] Frontend already initialized in `Result_Analyzer/`
- [ ] Install dependencies:
  - react-router-dom
  - axios
  - @mui/material (or Ant Design)
  - recharts
  - react-toastify
- [ ] Setup routing structure
- [ ] Create AuthContext for JWT management

#### Step 9: Login Page (1 hour)
- [ ] Create login form
- [ ] Email/password validation
- [ ] JWT storage in localStorage
- [ ] Redirect based on role
- [ ] Green dark theme styling

#### Step 10: Student Dashboard (2 hours)
- [ ] Profile display (USN, Name, CGPA, Rank)
- [ ] Semester results table
- [ ] SGPA trend chart (line graph)
- [ ] Subject performance radar chart
- [ ] First-login modal (ask for section, gender)
- [ ] Download marksheet button

#### Step 11: Teacher Dashboard (1.5 hours)
- [ ] My subjects list
- [ ] Student list table (sortable, searchable)
- [ ] Performance stats cards
- [ ] Grade distribution pie chart

#### Step 12: HOD Dashboard (2 hours)
- [ ] College overview stats
- [ ] Top performers leaderboard
- [ ] Subject analytics table
- [ ] Section comparison bar chart
- [ ] Excel export button

#### Step 13: Admin Dashboard (2 hours)
- [ ] User management table (CRUD)
- [ ] Add user form
- [ ] Scraping interface:
  - Semester selector
  - USN range inputs
  - URL input
  - Start scraping button
  - Live logs display
- [ ] System stats

---

### Phase 3: Integration & Testing

#### Step 14: Scraping Integration (1 hour)
- [ ] Backend: spawn Python process
- [ ] Capture stdout/stderr
- [ ] Stream logs to frontend via WebSocket (or SSE)
- [ ] Handle errors gracefully

#### Step 15: Excel Export (1 hour)
- [ ] Backend: use `exceljs` to generate Excel
- [ ] Frontend: download file
- [ ] Format: Headers, borders, filters

#### Step 16: UI/UX Polish (1 hour)
- [ ] Add college logo
- [ ] Sidebar navigation
- [ ] Green dark theme consistency
- [ ] Responsive design (mobile-friendly)
- [ ] Loading states
- [ ] Error handling toasts

#### Step 17: Testing (1 hour)
- [ ] Test all 4 roles
- [ ] Test password change
- [ ] Test scraping (dry run with 1 student)
- [ ] Test Excel export
- [ ] Fix bugs

---

## 🎨 Design Specifications

### Color Palette (Green Dark Theme)
```css
--primary-green: #1B5E20;      /* Dark green */
--secondary-green: #2E7D32;    /* Medium green */
--accent-green: #4CAF50;       /* Light green */
--bg-dark: #121212;            /* Background */
--bg-dark-secondary: #1E1E1E;  /* Cards */
--text-primary: #E0E0E0;       /* Primary text */
--text-secondary: #B0B0B0;     /* Secondary text */
--border: #333333;             /* Borders */
--error: #F44336;              /* Error red */
--warning: #FF9800;            /* Warning orange */
--success: #4CAF50;            /* Success green */
```

### Layout
```
┌─────────────────────────────────────────────┐
│ Logo  │  VTU Results Analyzer        │ User │
├───────┼─────────────────────────────────────┤
│       │                                     │
│ Dash  │                                     │
│ ──────│         MAIN CONTENT AREA           │
│ Studs │                                     │
│ ──────│                                     │
│ Subjs │                                     │
│ ──────│                                     │
│ Users │                                     │
│ ──────│                                     │
│ Logs  │                                     │
│       │                                     │
└───────┴─────────────────────────────────────┘
  Sidebar           Main Content
```

---

## 🔐 Security Checklist

- [x] JWT token expiry (24 hours)
- [x] Password hashing with bcrypt (salt rounds: 10)
- [x] Force password change on first login
- [x] Role-based access control middleware
- [x] SQL injection prevention (parameterized queries)
- [x] CORS configuration (restrict origins in production)
- [x] Input validation (express-validator)
- [x] No sensitive data in frontend
- [ ] HTTPS in production
- [ ] Rate limiting (future)

---

## 📦 Dependencies List

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^9.1.1",
    "mysql2": "^3.6.5",
    "express-validator": "^7.0.1",
    "exceljs": "^4.4.0",
    "pdfkit": "^0.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Frontend (`Result_Analyzer/package.json`)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "axios": "^1.6.2",
    "@mui/material": "^5.14.20",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "recharts": "^2.10.3",
    "react-toastify": "^9.1.3"
  }
}
```

---

## 🐍 Python Scraper Integration

### Backend API Call
```javascript
// backend/src/services/scraper.js
const { spawn } = require('child_process');

async function triggerScraping(semester, usnStart, usnEnd, url) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      '../ultimate_scraper.py',
      '--semester', semester,
      '--usn-start', usnStart,
      '--usn-end', usnEnd,
      '--url', url
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Emit to WebSocket for live logs
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error('Scraping failed'));
    });
  });
}
```

---

## 📋 API Endpoints Summary

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

### Student
- `GET /api/student/profile` - Profile
- `GET /api/student/results/:semester` - Semester results
- `GET /api/student/sgpa/:semester` - SGPA
- `GET /api/student/cgpa` - CGPA
- `GET /api/student/rank` - Rank
- `POST /api/student/update-profile` - Update profile

### Teacher
- `GET /api/teacher/subjects` - Assigned subjects
- `GET /api/teacher/students/:subjectCode` - Students
- `GET /api/teacher/performance/:subjectCode` - Performance

### HOD
- `GET /api/hod/overview` - Overview
- `GET /api/hod/top-performers` - Top performers
- `GET /api/hod/subject-analytics` - Subject stats
- `POST /api/hod/export` - Excel export

### Admin
- `GET /api/admin/users` - All users
- `POST /api/admin/users` - Add user
- `PUT /api/admin/users/:id` - Edit user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/scrape` - Trigger scraping
- `GET /api/admin/scrape/logs` - Scraping logs

---

## ✅ Phase 1 Definition of Done

**Backend:**
- [x] All API endpoints implemented and tested
- [x] 4 seed users created
- [x] JWT authentication working
- [x] MySQL connection established
- [x] Python scraper integration working

**Frontend:**
- [x] Login page functional
- [x] 4 dashboards built (Student, Teacher, HOD, Admin)
- [x] Routing working
- [x] Charts rendering
- [x] Excel export working
- [x] Green dark theme applied
- [x] Logo placed

**Integration:**
- [x] Frontend can call all backend APIs
- [x] JWT stored and sent correctly
- [x] Role-based rendering working
- [x] Password change flow working
- [x] First-login profile update working

---

## 🚧 Out of Scope (Phase 2)

- Ticketing system
- Bulk user import
- Email notifications
- PDF marksheet generation
- Advanced analytics
- Parent portal
- Mobile app
- Dark mode toggle (already dark)

---

**Status:** Ready to build ✅  
**Estimated Time:** 15-20 hours total  
**Start Command:** Type "ready" when you're ready to begin!
