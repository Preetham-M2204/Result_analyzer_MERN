# VTU Results Scraper - Utils Documentation

## 📁 Folder Structure

```
Preetham version/
├── 2023_details.xlsx              # Student data (your existing file)
├── semester_3_subjects.xlsx       # Generated subjects file
└── utils/
    ├── __init__.py
    ├── db_config.py               # Database configuration
    ├── insert_students.py         # Insert students from Excel
    ├── create_subjects_excel.py   # Generate subjects Excel
    ├── insert_subjects.py         # Insert subjects into DB
    └── scrape_vtu_results.py      # Scrape VTU results
```

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

```powershell
cd "d:\preetham\scrapper"
pip install -r requirements.txt
```

### Step 2: Create Database Tables

```powershell
mysql -u root -p resana < database_schema.sql
```

### Step 3: Test Database Connection

```powershell
cd "Preetham version\utils"
python db_config.py
```

### Step 4: Insert Student Data

```powershell
python insert_students.py
```

This will:
- ✅ Read `2023_details.xlsx`
- ✅ Insert all students into `student_details` table
- ✅ Set `cgpa = 0.00` for all students
- ✅ Handle NULL for empty cells

### Step 5: Create Subjects Excel (First Time Only)

```powershell
python create_subjects_excel.py
```

This generates `semester_3_subjects.xlsx` with all Semester 3 subjects and credits.

### Step 6: Insert Subjects

```powershell
python insert_subjects.py
```

This inserts all subjects from the Excel file into the `subjects` table.

### Step 7: Scrape VTU Results

```powershell
python scrape_vtu_results.py
```

Options:
1. **Scrape all students** - Automatically scrapes results for everyone in the database
2. **Test single USN** - Test the scraper with one USN first (recommended)

---

## 📋 Script Details

### `db_config.py`
- Database connection configuration
- Connection: `localhost`, User: `root`, Password: `123456`, Database: `resana`
- Functions: `get_db_connection()`, `close_connection()`, `test_connection()`

### `insert_students.py`
- Reads: `2023_details.xlsx`
- Inserts into: `student_details` table
- Features:
  - Sets `cgpa = 0.00` for all students
  - Handles NULL for empty cells
  - Defaults: `batch=2023`, `discipline='VTU'`
  - Shows verification output

### `create_subjects_excel.py`
- Generates: `semester_3_subjects.xlsx`
- Based on VTU Semester 3 curriculum
- Includes all subject variants (ESC/AEC options)

### `insert_subjects.py`
- Reads: `semester_3_subjects.xlsx`
- Inserts into: `subjects` table
- Uses `ON DUPLICATE KEY UPDATE` (safe to run multiple times)

### `scrape_vtu_results.py`
- URL: `https://results.vtu.ac.in/DJcbcs25/index.php`
- Features:
  - Scrapes all subjects for each USN
  - Extracts: Subject Code, Internal, External, Total, Result Status
  - Inserts into: `results` table with `semester = 3`
  - Rate limiting: 2 seconds between requests
  - Error handling and logging
  - Test mode for single USN

---

## ⚠️ Important Notes

### Database Schema Required Fields
- `student_details.usn` - PRIMARY KEY (required)
- `student_details.name` - NOT NULL (required)
- All other fields can be NULL

### Excel File Requirements

**2023_details.xlsx** must have columns:
- `USN` (required)
- `Name` (required)
- `Gender`
- `Batch`
- `discipline`
- `DOB`
- `section`
- `cgpa` (will be set to 0.00)

**semester_3_subjects.xlsx** must have columns:
- `subject_code` (required)
- `subject_name` (required)
- `semester`
- `credits`
- `short_code`

### Scraping Best Practices
1. **Test first**: Always test with a single USN before bulk scraping
2. **Rate limiting**: Script has 2-second delay between requests (DO NOT remove)
3. **Error handling**: Script logs all errors and continues
4. **VTU downtime**: VTU portal may be down during certain hours

---

## 🔧 Troubleshooting

### Issue: "Import mysql.connector could not be resolved"
```powershell
pip install mysql-connector-python
```

### Issue: "Excel file not found"
- Check file path in script
- Ensure file exists at: `d:\preetham\scrapper\Preetham version\2023_details.xlsx`

### Issue: "Database connection failed"
- Verify MySQL is running
- Check credentials in `db_config.py`
- Ensure database `resana` exists

### Issue: "No results found" when scraping
- VTU portal may be down
- Check USN format (should be uppercase)
- Verify VTU URL is correct
- Check if results are published for that semester

### Issue: "Foreign key constraint fails" when inserting results
- Ensure students are inserted first (`insert_students.py`)
- Ensure subjects are inserted first (`insert_subjects.py`)
- Check if `subject_code` in results matches subjects table

---

## 📊 Verification Queries

After running scripts, verify data in MySQL:

```sql
-- Check students
SELECT COUNT(*) FROM student_details;
SELECT * FROM student_details LIMIT 5;

-- Check subjects
SELECT COUNT(*) FROM subjects WHERE semester = 3;
SELECT * FROM subjects WHERE semester = 3;

-- Check results
SELECT COUNT(*) FROM results WHERE semester = 3;
SELECT 
    sd.usn, 
    sd.name, 
    COUNT(r.subject_code) as subjects_count
FROM student_details sd
LEFT JOIN results r ON sd.usn = r.student_usn AND r.semester = 3
GROUP BY sd.usn, sd.name
LIMIT 10;
```

---

## 🎯 Execution Order (First Time)

```
1. Install dependencies (requirements.txt)
   ↓
2. Create database tables (database_schema.sql)
   ↓
3. Test connection (db_config.py)
   ↓
4. Insert students (insert_students.py)
   ↓
5. Generate subjects Excel (create_subjects_excel.py)
   ↓
6. Insert subjects (insert_subjects.py)
   ↓
7. Test scraper with single USN (scrape_vtu_results.py option 2)
   ↓
8. Scrape all students (scrape_vtu_results.py option 1)
```

---

## 📝 Next Steps (Semester 4)

When ready for Semester 4:
1. Create `semester_4_subjects.xlsx` (similar to Semester 3)
2. Run `insert_subjects.py` with Semester 4 file
3. Update `scrape_vtu_results.py` with Semester 4 VTU URL
4. Run scraper with `semester=4`

---

**Created:** October 24, 2025  
**Database:** resana  
**Semester:** 3 (initial setup)
