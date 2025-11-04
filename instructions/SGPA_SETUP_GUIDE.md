# SGPA/CGPA AUTO-CALCULATION SETUP GUIDE
## Complete Step-by-Step Instructions

---

## 📋 OVERVIEW

After scraping completes, the system will automatically:
1. ✅ Calculate **letter grades** (O, A+, A, B+, B, C, P, F) from total marks
2. ✅ Assign **grade points** (0-10 scale)
3. ✅ Compute **SGPA** (Semester GPA) for each student
4. ✅ Calculate **total marks** and **percentage** per semester
5. ✅ Determine **class grade** (FCD, FC, SC, P, F)
6. ✅ Update **CGPA** (Cumulative GPA - mean of all SGPAs)
7. ✅ Track **backlogs** (failed subjects count)

---

## 🗄️ STEP 1: ADD DATABASE FIELDS

### Open MySQL and connect to your database:
```bash
mysql -u root -p
use resana;
```

### Run these ALTER commands:

```sql
-- 1. Add letter_grade and grade_points to results table
ALTER TABLE results
ADD COLUMN letter_grade VARCHAR(5) DEFAULT NULL COMMENT 'O, A+, A, B+, B, C, P, F'
AFTER total_marks;

ALTER TABLE results
ADD COLUMN grade_points INT DEFAULT NULL COMMENT '0-10 grade points'
AFTER letter_grade;

-- 2. Add detailed columns to student_semester_summary table
ALTER TABLE student_semester_summary
ADD COLUMN total_marks_obtained INT DEFAULT 0 COMMENT 'Sum of all subject marks',
ADD COLUMN total_marks_maximum INT DEFAULT 0 COMMENT 'Sum of all subject max marks',
ADD COLUMN percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Overall percentage for semester',
ADD COLUMN total_credits INT DEFAULT 0 COMMENT 'Total credits for semester',
ADD COLUMN class_grade VARCHAR(10) DEFAULT NULL COMMENT 'FCD, FC, SC, P, F',
ADD COLUMN has_backlogs BOOLEAN DEFAULT FALSE COMMENT 'Any failed subjects',
ADD COLUMN backlog_count INT DEFAULT 0 COMMENT 'Number of failed subjects',
ADD COLUMN calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When SGPA was calculated';

-- 3. Verify changes
DESCRIBE results;
DESCRIBE student_semester_summary;
```

### Expected Output:
```
results table should now have:
- letter_grade VARCHAR(5)
- grade_points INT

student_semester_summary should now have:
- sgpa DECIMAL(4,2)
- total_marks_obtained INT
- total_marks_maximum INT
- percentage DECIMAL(5,2)
- total_credits INT
- class_grade VARCHAR(10)
- has_backlogs BOOLEAN
- backlog_count INT
- calculated_at TIMESTAMP
```

---

## 📁 STEP 2: FILES CREATED

### 1. SQL Script (for manual database updates)
**Location**: `backend/scripts/ADD_SGPA_FIELDS.sql`
- Contains all ALTER TABLE commands
- Run once to add new columns

### 2. Python Grade Calculator
**Location**: `backend/scripts/calculate_grades.py`
- Main calculation engine
- Can be run manually or automatically
- Calculates SGPA, CGPA, letter grades, class grades

### 3. Updated FastAPI Service
**Location**: `backend/scraper_service/main.py`
- Auto-runs grade calculation after scraping
- No manual intervention needed

---

## 🎯 STEP 3: GRADE CALCULATION LOGIC

### Letter Grade Mapping (Based on Percentage)
```python
90-100%  → O   (Outstanding)    → 10 grade points
80-89%   → A+  (Excellent)      → 9 grade points
70-79%   → A   (Very Good)      → 8 grade points
60-69%   → B+  (Good)           → 7 grade points
50-59%   → B   (Above Average)  → 6 grade points
40-49%   → C   (Average)        → 5 grade points
35-39%   → P   (Pass)           → 4 grade points
<35%     → F   (Fail)           → 0 grade points
```

### SGPA Calculation (Per Semester)
```
SGPA = Σ(credits × grade_points) / Σ(credits)

Example:
Subject 1: 4 credits, 85 marks, max 100 → 85% → A+ → 9 points → 4×9 = 36
Subject 2: 3 credits, 72 marks, max 100 → 72% → A  → 8 points → 3×8 = 24
Subject 3: 4 credits, 98 marks, max 100 → 98% → O  → 10 points → 4×10 = 40

SGPA = (36 + 24 + 40) / (4 + 3 + 4) = 100 / 11 = 9.09
```

### CGPA Calculation (Overall)
```
CGPA = Mean of all semester SGPAs

Example:
Semester 1 SGPA: 8.50
Semester 2 SGPA: 7.80
Semester 3 SGPA: 9.00
Semester 4 SGPA: 9.09

CGPA = (8.50 + 7.80 + 9.00 + 9.09) / 4 = 8.60
```

### Class Grade Logic
```python
if has_backlogs or SGPA < 4.0:
    class_grade = 'F'      # Fail

elif SGPA >= 7.75:
    class_grade = 'FCD'    # First Class with Distinction

elif SGPA >= 6.25:
    class_grade = 'FC'     # First Class

elif SGPA >= 5.0:
    class_grade = 'SC'     # Second Class

else:
    class_grade = 'P'      # Pass
```

### Total Marks & Percentage
```python
# Sum all subject marks
total_marks_obtained = sum(total_marks for all subjects)

# Sum all max marks (most subjects = 100, some = 200)
total_marks_maximum = sum(max_marks for all subjects)

# Calculate percentage
percentage = (total_marks_obtained / total_marks_maximum) × 100
```

### Special Handling for 200-Mark Subjects
```python
# Automatically detect subjects with 200 max marks:
- Project subjects (name contains "PROJECT", "INTERNSHIP", "DISSERTATION")
- Semester 8 major subjects (name contains "MAJOR")
- Default: 100 marks
```

---

## 🚀 STEP 4: HOW TO USE

### Option 1: Automatic (Recommended)
**The scraper automatically calculates grades after completion!**

When you run scraper via FastAPI:
```bash
POST http://localhost:3000/scraper/vtu/start
{
  "url": "https://results.vtu.ac.in/...",
  "mode": "batch",
  "batchYear": 2023,
  "semester": 4,
  "workers": 20
}
```

After scraping completes:
1. ✅ Results stored in `results` table
2. ✅ **AUTOMATIC**: Grades calculated
3. ✅ **AUTOMATIC**: SGPA/CGPA updated
4. ✅ **AUTOMATIC**: Class grades assigned

**No manual intervention needed!**

---

### Option 2: Manual Calculation (If Needed)

If you want to recalculate grades for a semester:

```bash
cd backend/scripts
python calculate_grades.py --semester 4
```

**Output Example:**
```
============================================================
STEP 1: Updating Letter Grades for Semester 4
============================================================
Found 120 subject results to process
  Processed 50 results...
  Processed 100 results...
✅ Updated letter grades for 120 results

============================================================
STEP 2: Calculating SGPA for Semester 4
============================================================
Found 24 students to process
  Processed 20 students...
✅ Calculated SGPA for 24 students

============================================================
STEP 3: Updating CGPA for All Students
============================================================
Found 24 students to update
✅ Updated CGPA for 24 students

============================================================
SEMESTER 4 - SUMMARY REPORT
============================================================

📊 Total Students: 24
📈 Average SGPA: 7.85
🏆 Highest SGPA: 9.50
📉 Lowest SGPA: 5.20
⚠️  Students with Backlogs: 2 (8.3%)

🎓 Class Grade Distribution:
   FCD   :  10 students ( 41.7%)
   FC    :   8 students ( 33.3%)
   SC    :   4 students ( 16.7%)
   P     :   0 students (  0.0%)
   F     :   2 students (  8.3%)
============================================================
```

---

## 📊 STEP 5: VERIFY RESULTS

### Check Results Table (Letter Grades)
```sql
SELECT 
    student_usn,
    subject_code,
    total_marks,
    letter_grade,
    grade_points
FROM results
WHERE semester = 4
LIMIT 10;
```

**Expected Output:**
```
+-------------+--------------+-------------+--------------+--------------+
| student_usn | subject_code | total_marks | letter_grade | grade_points |
+-------------+--------------+-------------+--------------+--------------+
| 1BI23IS001  | BCS401       |          87 | A+           |            9 |
| 1BI23IS001  | BCS402       |          73 | A            |            8 |
| 1BI23IS001  | BCS403       |          98 | O            |           10 |
| 1BI23IS001  | BCS404       |          82 | A+           |            9 |
+-------------+--------------+-------------+--------------+--------------+
```

### Check Semester Summary (SGPA & Class Grades)
```sql
SELECT 
    student_usn,
    semester,
    sgpa,
    total_marks_obtained,
    total_marks_maximum,
    percentage,
    total_credits,
    class_grade,
    backlog_count
FROM student_semester_summary
WHERE semester = 4
ORDER BY sgpa DESC
LIMIT 10;
```

**Expected Output:**
```
+-------------+----------+------+----------------------+---------------------+------------+---------------+-------------+---------------+
| student_usn | semester | sgpa | total_marks_obtained | total_marks_maximum | percentage | total_credits | class_grade | backlog_count |
+-------------+----------+------+----------------------+---------------------+------------+---------------+-------------+---------------+
| 1BI23IS001  |        4 | 9.50 |                  475 |                 500 |      95.00 |            20 | FCD         |             0 |
| 1BI23IS002  |        4 | 8.75 |                  438 |                 500 |      87.60 |            20 | FCD         |             0 |
| 1BI23IS003  |        4 | 7.80 |                  390 |                 500 |      78.00 |            20 | FCD         |             0 |
+-------------+----------+------+----------------------+---------------------+------------+---------------+-------------+---------------+
```

### Check Student CGPA
```sql
SELECT 
    usn,
    name,
    cgpa,
    batch,
    section
FROM student_details
WHERE cgpa IS NOT NULL
ORDER BY cgpa DESC
LIMIT 10;
```

**Expected Output:**
```
+-------------+------------------+------+-------+---------+
| usn         | name             | cgpa | batch | section |
+-------------+------------------+------+-------+---------+
| 1BI23IS001  | PREETHAM RAJ     | 9.25 |  2023 | A       |
| 1BI23IS015  | STUDENT NAME     | 8.90 |  2023 | A       |
| 1BI23IS010  | ANOTHER STUDENT  | 8.75 |  2023 | A       |
+-------------+------------------+------+-------+---------+
```

---

## 🎓 STEP 6: FRONTEND INTEGRATION (OPTIONAL)

If you want to show SGPA/CGPA on frontend, add these API endpoints:

### Backend API (`backend/src/controllers/resultsController.js`)
```javascript
// Get semester summary for a student
exports.getStudentSemesterSummary = async (req, res) => {
  const { usn } = req.params;
  
  const [rows] = await mysqlPool.execute(`
    SELECT 
      semester, sgpa, total_marks_obtained, total_marks_maximum,
      percentage, class_grade, backlog_count
    FROM student_semester_summary
    WHERE student_usn = ?
    ORDER BY semester
  `, [usn]);
  
  res.json({ success: true, data: rows });
};

// Get top students by CGPA
exports.getTopStudents = async (req, res) => {
  const { limit = 10 } = req.query;
  
  const [rows] = await mysqlPool.execute(`
    SELECT usn, name, cgpa, batch, section
    FROM student_details
    WHERE cgpa IS NOT NULL
    ORDER BY cgpa DESC, usn ASC
    LIMIT ?
  `, [parseInt(limit)]);
  
  res.json({ success: true, data: rows });
};
```

---

## 🐛 TROUBLESHOOTING

### Issue 1: "No credit info" warnings
**Problem**: Some subjects don't have credits in `subjects` table

**Solution**: Add missing subjects
```bash
cd backend/scripts
python insert_subjects.py
```

### Issue 2: Grade calculation doesn't run automatically
**Problem**: FastAPI can't import `calculate_grades.py`

**Solution**: Check file exists
```bash
ls backend/scripts/calculate_grades.py
```

If missing, create it from the provided code.

### Issue 3: Wrong letter grades
**Problem**: Marks-to-grade mapping seems off

**Solution**: Check subject max marks
- Most subjects: 100 marks
- Projects/Internships: 200 marks
- Edit `get_subject_max_marks()` in `calculate_grades.py` if needed

### Issue 4: CGPA not updating
**Problem**: CGPA shows NULL in student_details

**Solution**: Manually run calculator
```bash
python calculate_grades.py --semester 4
```

---

## 📈 SUMMARY

### What Gets Calculated:
✅ **Letter Grades**: O, A+, A, B+, B, C, P, F (based on percentage)  
✅ **Grade Points**: 0-10 scale (for SGPA calculation)  
✅ **SGPA**: Semester GPA (weighted average of grade points)  
✅ **Total Marks**: Sum of all subject marks obtained  
✅ **Maximum Marks**: Sum of all subject max marks (handles 200-mark subjects)  
✅ **Percentage**: (Total Marks / Max Marks) × 100  
✅ **Class Grade**: FCD, FC, SC, P, F (based on SGPA)  
✅ **Backlogs**: Count of failed subjects (grade = F)  
✅ **CGPA**: Mean of all semester SGPAs  

### When It Runs:
- ✅ **Automatically** after every scraping session (VTU only, for now)
- ✅ **Manually** via `python calculate_grades.py --semester X`

### Database Tables Updated:
1. `results` → letter_grade, grade_points
2. `student_semester_summary` → sgpa, percentage, class_grade, etc.
3. `student_details` → cgpa

---

## ✅ NEXT STEPS

1. **Run SQL commands** from STEP 1 to add database fields
2. **Test scraper** - Run a small batch to verify auto-calculation works
3. **Check database** - Verify letter grades, SGPA, CGPA are populated
4. **Optional**: Add frontend displays for SGPA/CGPA

---

**All files ready!** Just run the SQL commands and you're set! 🚀
