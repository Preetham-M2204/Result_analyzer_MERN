# VTU Results Analyzer - Product Requirements Document (PRD)
## Feature Specification & Requirements

---

## 🎯 Project Overview

A comprehensive **Results Analysis & Management System** for college administration, faculty, and students to analyze academic performance data.

**Technology Stack:**
- Frontend: React.js
- Backend: Node.js + Express.js
- Database: MySQL (existing database: `resana`)

---

## 📊 Existing Database

### Current Tables
```sql
student_details
- usn (Primary Key) - e.g., "1BI23IS001"
- name - Student full name
- cgpa - Cumulative GPA (auto-computed)

subjects
- subject_code (Primary Key) - e.g., "BMATS101"
- semester (1-4)
- subject_name - Full subject name
- credits (1-4)

results
- id (Primary Key)
- student_usn (Foreign Key → student_details.usn)
- subject_code (Foreign Key → subjects.subject_code)
- semester (1-4)
- internal_marks (0-50)
- external_marks (0-100)
- total_marks (0-150)
- result_status ("PASS"/"FAIL")

student_semester_summary
- student_usn (Foreign Key)
- semester (1-4)
- sgpa - Semester GPA (auto-computed)
```

**Current Data:**
- 210 students (144 regular + 66 lateral entry)
- 4 semesters of results (5,154 records)
- 42 subjects across semesters
- SGPA/CGPA already computed

---

## 👥 User Roles & Permissions

### 1. DBA (Database Administrator)

**Can:**
- ✅ View and modify all database records
- ✅ Manage tickets (approve/reject data change requests)
- ✅ Initiate VTU results scraping for new semesters
- ✅ Add/remove users (HOD, Teachers, Students)
- ✅ Configure system settings
- ✅ View audit logs of all actions
- ✅ Export data in any format

**Dashboard Needs:**
- Pending tickets queue
- Scraping interface (select semester, USN range, trigger scraping)
- User management panel
- Database health metrics (missing data alerts)
- Recent activity log

### 2. HOD (Head of Department)

**Can:**
- ✅ View all students' results (entire college)
- ✅ Analyze subject-wise performance
- ✅ Compare teacher performance
- ✅ Compare section performance (Section A vs B)
- ✅ View semester-wise trends
- ✅ Export results to Excel
- ✅ Raise tickets to DBA
- ✅ Track SGPA/CGPA for placement purposes
- ❌ Cannot modify database directly

**Dashboard Needs:**
- College-wide performance overview
- Top N performers ranking (configurable)
- Subject analytics (pass %, average marks, grade distribution)
- Teacher comparison charts
- Section comparison charts
- Placement readiness report (CGPA filters)
- Trend analysis graphs
- Excel export with custom filters

### 3. TEACHER (Faculty)

**Can:**
- ✅ View results for subjects they teach
- ✅ See student list for their subjects
- ✅ Analyze subject-wise performance (their subjects only)
- ✅ Compare sections (if teaching multiple)
- ✅ Export results for their subjects
- ✅ Raise tickets to DBA (e.g., marks correction)
- ❌ Cannot view other teachers' subjects
- ❌ Cannot modify database

**Dashboard Needs:**
- My subjects overview
- Class-wise performance stats
- Student performance tracking
- Pass/fail statistics
- Grade distribution charts
- Weak students identification (marks < threshold)
- Excel export for their subjects

### 4. STUDENT

**Can:**
- ✅ View their own results (all semesters)
- ✅ See their SGPA/CGPA
- ✅ View their college rank & percentile
- ✅ See semester-wise performance trends
- ✅ Analyze subject-wise performance
- ✅ Download mark sheets (PDF/Excel)
- ✅ Raise tickets for discrepancies
- ❌ Cannot view other students' absolute data
- ❌ Can only see relative position (rank/percentile)

**Dashboard Needs:**
- Academic summary (CGPA, rank, percentile)
- Semester-wise SGPA graph
- Subject-wise performance visualization
- Progress tracker over semesters
- Comparison with class average (anonymized)
- Backlog tracker
- Download marksheet option

---

## 🎨 Core Features by Role

### DBA Dashboard Features

**Ticket Management System**
- View all tickets from students, teachers, HOD
- Filter by status (pending, in-progress, resolved, rejected)
- Filter by type (data correction, add subject, add student, other)
- Filter by priority (low, medium, high)
- Approve or reject requests
- Add resolution notes

**Scraping Interface**
- Select semester (1-8)
- Specify USN range (from-to)
- Enter VTU results URL
- Start scraping process
- Real-time progress tracking
- Live scraping logs display
- View scraping history

**User Management**
- View all users
- Add new users (HOD, Teacher, Student)
- Edit user details
- Delete/deactivate users
- Assign roles

**Database Health Monitor**
- Total students count
- Total results count
- Data completeness percentage
- Missing data alerts (semester-wise)
- Last scraping timestamp

**Audit Logging**
- View all system activities
- Filter by user
- Filter by action type (insert, update, delete, export, scrape)
- Filter by date range
- Export audit logs

---

### HOD Dashboard Features

**Performance Overview**
- College average CGPA
- Total students count
- Students with CGPA > 9.0
- Students with backlogs
- Top performer highlight

**Rankings & Leaderboard**
- Top N students (configurable limit: 10, 20, 50, 100)
- Sortable by CGPA, USN, name
- Display: Rank, USN, Name, CGPA, Backlogs count
- Filter by semester
- Filter by section

**Subject Analytics**
- Select semester and section
- View subject-wise statistics:
  - Average marks
  - Pass percentage
  - Grade distribution (O, A+, A, B+, B, C, F counts)
  - Highest and lowest marks
  - Teacher name
- Compare subjects within same semester

**Teacher Performance Comparison**
- Select semester
- Compare teachers by:
  - Average pass percentage
  - Average student marks
  - Number of students taught
  - Subjects handled
- Visual charts for comparison

**Section Comparison**
- Compare Section A vs Section B
- Metrics: Average CGPA, Pass %, Average marks per subject
- Semester-wise comparison
- Visual charts (bar/line graphs)

**Placement Readiness**
- Filter students by:
  - Minimum CGPA (e.g., 7.0)
  - Maximum backlogs allowed (e.g., 0)
  - Specific semester completion
- View eligible students count
- Export placement-ready student list

**Trend Analysis**
- Semester-wise average CGPA trend (all students)
- Subject-wise performance trends over semesters
- Year-over-year comparison (if data available)
- Visual line/area charts

**Data Export**
- Export format options: Excel, CSV, PDF
- Data selection: All students, Section A, Section B, Custom filter
- Semester selection: Individual or all semesters
- Include options: Marks, SGPA, Rank, Internal/External split
- Custom column selection

**Ticket System**
- Raise new tickets to DBA
- View my raised tickets
- Track ticket status

---

### Teacher Dashboard Features

**My Subjects**
- List of subjects assigned to teacher
- For each subject: Code, Name, Semester, Sections, Student count

**Class Performance (Per Subject)**
- Select subject and section
- View statistics:
  - Total students
  - Average marks
  - Pass percentage
  - Highest marks (with student name)
  - Lowest marks (with student name)
  - Median marks
- Grade distribution chart

**Student List**
- View all students for selected subject & section
- Display: USN, Name, Internal marks, External marks, Total, Grade, Pass/Fail
- Sortable by any column
- Searchable by USN or name
- Filter by pass/fail status
- Filter by grade range

**Weak Students Identification**
- Automatically identify students with marks < threshold (e.g., 50)
- Alert list with student details
- Suggested recommendations
- Filter by different thresholds

**Section Comparison (If teaching multiple sections)**
- Compare performance across sections they teach
- Metrics: Average marks, Pass %, Grade distribution
- Visual comparison charts

**Data Export**
- Export student list with marks for their subjects
- Format: Excel with predefined template
- Columns: USN, Name, Internal, External, Total, Grade, Remarks

**Ticket System**
- Raise tickets (especially for marks correction)
- View my raised tickets
- Track ticket status

---

### Student Dashboard Features

**Academic Summary**
- Profile display: USN, Name, Section
- CGPA (current)
- College rank (overall)
- Percentile (top X%)
- Quick stats: Semesters completed, Total credits, Backlogs count

**CGPA Trend**
- Line graph showing CGPA progression over semesters
- Mark current semester

**SGPA Comparison**
- Bar chart: My SGPA vs Class Average (per semester)
- Visual comparison

**Semester Results View**
- Select semester
- Table display: Subject code, Subject name, Internal, External, Total, Grade, Credits
- SGPA summary for that semester

**Subject Performance Analysis**
- Radar chart showing performance across all subjects in a semester
- Identify strengths and weaknesses

**Rank Analysis**
- Display: "Your CGPA of X places you at:"
  - Rank: Y out of Z students
  - Top N% of your batch
  - Above M% of students
- CGPA distribution histogram (show where student stands)

**Backlog Tracker**
- List of failed subjects (if any)
- Display: Subject code, Subject name, Semester, Marks obtained
- Success message if no backlogs

**Download Options**
- Download complete marksheet (all semesters) as PDF
- Download marksheet as Excel
- Format: College letterhead, all semester results, CGPA

**Ticket System**
- Raise tickets for marks discrepancies
- View my raised tickets
- Track ticket status

---

## 📊 Data Visualization Requirements

**Chart Types Needed:**
- Line charts (trends over time)
- Bar charts (comparisons)
- Pie charts (distribution - pass/fail, grade distribution)
- Radar charts (multi-subject performance)
- Histogram (CGPA distribution)
- Heatmaps (optional - semester-wise performance grid)

**Common Chart Features:**
- Interactive (hover for details)
- Exportable as image
- Responsive (mobile-friendly)
- Color-coded (consistent color scheme)
- Legends

---

## 🔐 Security & Access Requirements

**Authentication:**
- Login system with username and password
- Role-based access (4 roles: DBA, HOD, TEACHER, STUDENT)
- Secure password storage
- Session management
- Auto-logout after inactivity

**Authorization:**
- Role-based permissions enforcement
- API endpoint protection
- Data access restrictions (e.g., teacher can't see other teachers' data)

**Data Privacy:**
- Students can only see their own marks
- Students see only rank/percentile of others (not absolute marks)
- Anonymized class averages

**Audit Trail:**
- Log all data modifications
- Log all exports
- Log all scraping activities
- Track who did what and when

---

## 📤 Export Functionality Requirements

**Excel Export Features:**
- Multiple format templates
- Auto-formatting (headers, borders, freeze panes)
- Conditional formatting (e.g., highlight failures in red)
- Include charts in Excel (optional)
- Custom column selection
- Filter-based export

**PDF Export Features:**
- Student marksheet template
- College letterhead/branding
- All semesters on one page or separate pages
- Professional formatting
- Digital signature placeholder (optional)

**Export Access Control:**
- DBA: Can export any data in any format
- HOD: Can export college-wide data
- Teacher: Can export only their subject data
- Student: Can download only their own marksheet

---

## 🔄 Scraping Integration Requirements

**DBA Scraping Interface:**
- Input: Semester number (1-8)
- Input: USN range (start USN, end USN)
- Input: VTU results URL
- Button: Start Scraping
- Display: Real-time progress (X/Y students scraped)
- Display: Live logs (which USN is being scraped, success/failure)
- History: View past scraping jobs
- Auto-save scraping status to database

**Scraping Logic:**
- Call existing Python scraper script (scrape_vtu_results_fast.py)
- Pass semester, USN range, URL as parameters
- Capture and display real-time output
- Handle errors gracefully
- Store scraping job details (start time, end time, status)

---

## 🎯 Additional Features & Enhancements

**Nice to Have (Future Scope):**
- Email/SMS notifications for result updates
- Dark mode toggle
- Mobile app (React Native)
- Attendance integration
- Assignment tracking
- Parent portal
- Placement tracking module
- Scholarship eligibility calculator
- What-if CGPA calculator ("If I score X, my CGPA will be Y")
- Multi-language support
- Offline mode (PWA)
- Data import from Excel (bulk operations)
- Automated backup system
- Performance benchmarking (compare with previous batches)

**Advanced Analytics (Future):**
- Subject difficulty index
- Student improvement tracker
- Predictive analytics (ML-based SGPA prediction)
- Correlation analysis (attendance vs marks)
- Teacher rating system
- Course feedback collection

---

## ✅ Must-Have Features (MVP - Phase 1)

**Critical for Launch:**
1. Login system with 4 roles
2. DBA: Ticket management + Scraping interface
3. HOD: College-wide analytics + Top performers + Excel export
4. Teacher: Subject performance + Student list
5. Student: Personal results + SGPA/CGPA + Rank
6. Basic charts (line, bar, pie)
7. Excel export
8. Secure authentication

**Should Have (Phase 2):**
- PDF marksheet generation
- Advanced analytics (trends, comparisons)
- Ticket status tracking
- Audit logging
- Real-time scraping progress
- Mobile responsiveness
- Section comparison
- Weak student alerts

**Nice to Have (Phase 3+):**
- Email notifications
- Dark mode
- Advanced filters
- Data import
- Predictive analytics
- Parent portal

---

## 🎓 System Constraints & Assumptions

**Assumptions:**
- SGPA/CGPA already computed in database
- Subject credits are defined
- Student section data will be added to database
- Teacher-subject mapping will be provided
- VTU website structure remains similar for scraping
- MySQL database is accessible
- Python scraper scripts are functional

**Constraints:**
- Use existing database schema (minimal modifications)
- Maintain data integrity (no direct DB edits by non-DBA roles)
- Performance: Dashboard should load within 3 seconds
- Concurrent users: Support at least 50 simultaneous users
- Data security: Follow college data privacy policies
- Browser support: Chrome, Firefox, Edge (latest 2 versions)

---

## 📋 Success Metrics

**User Adoption:**
- 80%+ students use the system within first month
- All teachers use it for their subjects
- HOD uses it for monthly reviews

**Performance:**
- Dashboard load time < 3 seconds
- Export generation < 10 seconds for 200 students
- Scraping completion < 10 minutes for 200 students

**Data Quality:**
- 100% accuracy in rank calculations
- Zero data corruption incidents
- 99%+ data completeness

**User Satisfaction:**
- Students can view results immediately after scraping
- Teachers save time with automated analytics
- HOD gets insights without manual Excel work
- DBA can manage system efficiently with ticket system

---

*This document serves as the product requirements specification. Technical implementation details, API design, and code architecture are to be determined during development phase.*
