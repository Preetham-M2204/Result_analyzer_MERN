# SGPA/CGPA MIGRATION - COMPLETE SETUP
## Run these commands in order

---

## STEP 1: Update Database Schema (MySQL)

Open MySQL Workbench or command line:

```bash
mysql -u root -p
```

Then run:

```sql
USE resana;

-- Add new columns to results table
ALTER TABLE results
ADD COLUMN letter_grade VARCHAR(5) DEFAULT NULL COMMENT 'O, A+, A, B+, B, C, P, F'
AFTER total_marks;

ALTER TABLE results
ADD COLUMN grade_points INT DEFAULT NULL COMMENT '0-10 grade points'
AFTER letter_grade;

-- Add new columns to student_semester_summary table
ALTER TABLE student_semester_summary
ADD COLUMN total_marks_obtained INT DEFAULT 0 COMMENT 'Sum of all subject marks',
ADD COLUMN total_marks_maximum INT DEFAULT 0 COMMENT 'Sum of all subject max marks',
ADD COLUMN percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Overall percentage for semester',
ADD COLUMN total_credits INT DEFAULT 0 COMMENT 'Total credits for semester',
ADD COLUMN class_grade VARCHAR(10) DEFAULT NULL COMMENT 'FCD, FC, SC, P, F',
ADD COLUMN has_backlogs BOOLEAN DEFAULT FALSE COMMENT 'Any failed subjects',
ADD COLUMN backlog_count INT DEFAULT 0 COMMENT 'Number of failed subjects',
ADD COLUMN calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When SGPA was calculated';

-- Verify changes
DESCRIBE results;
DESCRIBE student_semester_summary;
```

---

## STEP 2: Migrate Existing Data (Python)

Run the migration script to calculate grades for all existing data:

```bash
cd backend/scripts
python migrate_existing_data.py
```

This will:
- ✅ Add missing columns (if any)
- ✅ Calculate letter grades for ALL existing results
- ✅ Calculate SGPA for ALL student-semester combinations
- ✅ Calculate CGPA for ALL students
- ✅ Generate summary report

**Expected Output:**
```
======================================================================
DATABASE MIGRATION: SGPA/CGPA CALCULATION
======================================================================

This script will update your existing database with:
  1. New columns for letter grades and statistics
  2. Letter grades for all existing results
  3. SGPA for all student-semester combinations
  4. CGPA for all students

======================================================================

⚠️  Proceed with migration? (yes/no): yes

======================================================================
STEP 1: Adding New Database Columns
======================================================================

📋 Updating 'results' table...
  ✅ Added column: letter_grade
  ✅ Added column: grade_points

📊 Updating 'student_semester_summary' table...
  ✅ Added column: total_marks_obtained
  ✅ Added column: total_marks_maximum
  ... (etc.)

✅ Database schema updated successfully!

======================================================================
STEP 2: Calculating Letter Grades for Existing Results
======================================================================

📝 Found 2847 results to process...
  Progress: 100/2847 (3.5%) - Last: BCS401 → A+
  Progress: 200/2847 (7.0%) - Last: BCS402 → A
  ... (etc.)

✅ Updated letter grades for 2847 results!

======================================================================
STEP 3: Calculating SGPA for All Semesters
======================================================================

📊 Found 356 student-semester combinations to process...
  Progress: 50/356 (14.0%) - Last: 1BI23IS001 Sem 4 SGPA=8.75
  Progress: 100/356 (28.1%) - Last: 1BI23IS015 Sem 3 SGPA=7.80
  ... (etc.)

✅ Calculated SGPA for 356 student-semester combinations!

======================================================================
STEP 4: Updating CGPA for All Students
======================================================================

🎓 Found 89 students to process...
  Progress: 20/89 (22.5%) - Last: 1BI23IS020 CGPA=8.15
  Progress: 40/89 (44.9%) - Last: 1BI23IS040 CGPA=7.95
  ... (etc.)

✅ Updated CGPA for 89 students!

======================================================================
MIGRATION SUMMARY REPORT
======================================================================

📊 RESULTS:
   Total result records: 2847
   Results with letter grades: 2847 (100.0%)

🎓 STUDENTS:
   Students with SGPA records: 89
   Students with CGPA: 89

📈 CGPA STATISTICS:
   Average CGPA: 7.85
   Highest CGPA: 9.50
   Lowest CGPA: 5.20

🏆 CLASS GRADE DISTRIBUTION:
   FCD   :  35 students
   FC    :  28 students
   SC    :  18 students
   P     :   5 students
   F     :   3 students

======================================================================

✅ MIGRATION COMPLETED SUCCESSFULLY!
⏱️  Total time: 12.45 seconds

======================================================================
```

---

## STEP 3: Verify Results

Check that everything was calculated correctly:

```sql
-- Check letter grades
SELECT student_usn, subject_code, total_marks, letter_grade, grade_points
FROM results
WHERE semester = 4
LIMIT 10;

-- Check SGPA and statistics
SELECT 
    student_usn, semester, sgpa, 
    total_marks_obtained, total_marks_maximum, percentage,
    class_grade, backlog_count
FROM student_semester_summary
ORDER BY sgpa DESC
LIMIT 10;

-- Check CGPA
SELECT usn, name, cgpa, batch, section
FROM student_details
WHERE cgpa IS NOT NULL
ORDER BY cgpa DESC
LIMIT 10;

-- Check overall statistics
SELECT 
    COUNT(*) as total_students,
    AVG(cgpa) as avg_cgpa,
    MAX(cgpa) as highest_cgpa,
    MIN(cgpa) as lowest_cgpa
FROM student_details
WHERE cgpa IS NOT NULL;
```

---

## DONE! ✅

From now on:
- ✅ Every scraping session will **automatically calculate** SGPA/CGPA
- ✅ No manual intervention needed
- ✅ All existing data has been migrated

---

## Troubleshooting

### Issue: "Column already exists" error
**Solution**: The columns were already added. Skip to Step 2 (migration script).

### Issue: Migration script shows warnings about missing credits
**Solution**: Some subjects don't have credit info in the `subjects` table. Add them:
```bash
cd backend/scripts
python insert_subjects.py
```

### Issue: Want to re-run migration
**Solution**: The migration script is **idempotent** (safe to run multiple times). It will:
- Skip adding columns if they exist
- Update grades if already calculated
- Recalculate SGPA/CGPA

---

**All set!** Your database is now fully updated with SGPA/CGPA calculations! 🎉
