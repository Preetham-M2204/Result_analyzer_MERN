# QUICK START: SGPA/CGPA Auto-Calculation

## 🚀 3-Step Setup

### STEP 1: Add Database Fields (Run in MySQL)
```sql
use resana;

-- Add to results table
ALTER TABLE results ADD COLUMN letter_grade VARCHAR(5) DEFAULT NULL AFTER total_marks;
ALTER TABLE results ADD COLUMN grade_points INT DEFAULT NULL AFTER letter_grade;

-- Add to student_semester_summary table
ALTER TABLE student_semester_summary
ADD COLUMN total_marks_obtained INT DEFAULT 0,
ADD COLUMN total_marks_maximum INT DEFAULT 0,
ADD COLUMN percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN total_credits INT DEFAULT 0,
ADD COLUMN class_grade VARCHAR(10) DEFAULT NULL,
ADD COLUMN has_backlogs BOOLEAN DEFAULT FALSE,
ADD COLUMN backlog_count INT DEFAULT 0,
ADD COLUMN calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### STEP 2: That's It! ✅
The scraper will **automatically calculate** SGPA/CGPA after each scraping session.

### STEP 3: Test It
```bash
# Start backend
cd backend
npm run dev

# Start FastAPI
cd scraper_service
python main.py

# Run scraper (use Postman or frontend)
POST http://localhost:3000/scraper/vtu/start
{
  "url": "https://results.vtu.ac.in/...",
  "mode": "batch",
  "batchYear": 2023,
  "semester": 4
}

# Check results
SELECT * FROM student_semester_summary WHERE semester = 4;
```

---

## 📊 What Gets Calculated

| Field | Description | Example |
|-------|-------------|---------|
| `letter_grade` | O, A+, A, B+, B, C, P, F | A+ |
| `grade_points` | 0-10 scale | 9 |
| `sgpa` | Semester GPA | 8.75 |
| `total_marks_obtained` | Sum of all marks | 438 |
| `total_marks_maximum` | Sum of max marks | 500 |
| `percentage` | Overall % for semester | 87.60 |
| `class_grade` | FCD, FC, SC, P, F | FCD |
| `backlog_count` | Number of failed subjects | 0 |
| `cgpa` | Cumulative GPA (mean of SGPAs) | 8.60 |

---

## 🧮 Calculation Logic

```
Letter Grade = Based on percentage:
  90-100% → O  (10 points)
  80-89%  → A+ (9 points)
  70-79%  → A  (8 points)
  60-69%  → B+ (7 points)
  50-59%  → B  (6 points)
  40-49%  → C  (5 points)
  35-39%  → P  (4 points)
  <35%    → F  (0 points)

SGPA = Σ(credits × grade_points) / Σ(credits)

CGPA = Mean of all semester SGPAs

Class Grade:
  SGPA >= 7.75 → FCD (First Class Distinction)
  SGPA >= 6.25 → FC  (First Class)
  SGPA >= 5.00 → SC  (Second Class)
  SGPA >= 4.00 → P   (Pass)
  SGPA < 4.00  → F   (Fail)
```

---

## 📁 Files Created

1. **`backend/scripts/ADD_SGPA_FIELDS.sql`** - SQL commands to add database fields
2. **`backend/scripts/calculate_grades.py`** - Grade calculation engine
3. **`backend/scraper_service/main.py`** - Updated (auto-runs calculation)
4. **`SGPA_SETUP_GUIDE.md`** - Detailed documentation
5. **`SGPA_CGPA_CALCULATION.md`** - Technical explanation

---

## 🔧 Manual Calculation (If Needed)

```bash
cd backend/scripts
python calculate_grades.py --semester 4
```

---

## ✅ Verify

```sql
-- Check letter grades
SELECT student_usn, subject_code, total_marks, letter_grade, grade_points
FROM results WHERE semester = 4 LIMIT 5;

-- Check SGPA
SELECT student_usn, sgpa, percentage, class_grade, backlog_count
FROM student_semester_summary WHERE semester = 4;

-- Check CGPA
SELECT usn, name, cgpa FROM student_details WHERE cgpa IS NOT NULL ORDER BY cgpa DESC LIMIT 10;
```

---

**Done!** After running the SQL commands, scraping will auto-calculate everything. 🎉
