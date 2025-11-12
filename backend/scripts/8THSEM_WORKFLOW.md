# 8th Semester Results - Complete Workflow

## Overview
Process to update 2021 batch students and scrape/export 8th semester results.

## Prerequisites
- Excel file with student data (USN, NAME, Section, Discipline, BATCH)
- VTU 8th semester results URL
- Python packages: `pandas`, `openpyxl`

Install dependencies:
```bash
pip install pandas openpyxl
```

## Step-by-Step Instructions

### Method 1: Complete Workflow (All-in-One)

Run the complete script that does everything:

```bash
python update_2021_batch_and_scrape.py \
  --excel "8thsem_students.xlsx" \
  --url "https://results.vtu.ac.in/..." \
  --output "8thsem_complete_results.xlsx"
```

**What it does:**
1. ✅ Reads student data from Excel
2. ✅ Updates/inserts students in database (Section A)
3. ✅ Identifies B section students
4. ✅ Scrapes 8th sem results for B section
5. ✅ Exports all results to Excel

### Method 2: Step-by-Step (More Control)

#### Step 1: Update Students from Excel
```bash
python update_students_from_excel.py --excel "8thsem_students.xlsx"
```

This will:
- Read students from Excel
- Update existing students (name, section, discipline, batch)
- Insert new students

#### Step 2: Scrape Results for B Section

First, get list of B section USNs:
```bash
# Run a query or use the database
```

Then scrape:
```bash
python ultimate_scraper.py
# Enter batch: 2021
# Enter section: B
# Enter semester: 8
# Enter URL: https://results.vtu.ac.in/...
```

Or manually create USN list and use:
```bash
python ultimate_scraper.py --url "https://results.vtu.ac.in/..." --usns "1BI21IS051,1BI21IS052,..."
```

#### Step 3: Export Results to Excel
```bash
python export_8thsem_results.py --output "8thsem_results.xlsx" --batch 2021 --semester 8
```

## Excel File Format

### Input Format (Students)
```
USN          NAME                Section  Discipline  BATCH
1BI21IS001   AARIZ IMAM          A        VTU         2021
1BI21IS002   ABHISHEK SINGH      A        VTU         2021
...
```

### Output Format (Results)
```
USN          Name           Subject1_Code  Subject1_Name          Subject1_Internal  Subject1_External  Subject1_Total  Subject1_Grade  ...  SGPA  Class  Total
1BI21IS001   AARIZ IMAM     21INT822       INDUSTRY INTERNSHIP    92                 98                 190             O               ...  10    FCD    379
1BI21IS002   ABHISHEK SINGH 21INT822       INDUSTRY INTERNSHIP    86                 92                 178             O               ...  9     FCD    358
...
```

## Quick Commands

### Just Update Students (No Scraping)
```bash
python update_students_from_excel.py --excel "8thsem_students.xlsx"
```

### Just Export Results (Already Scraped)
```bash
python export_8thsem_results.py --output "8thsem_results.xlsx"
```

### Complete Workflow (Skip Scraping)
If you want to update students and export but not scrape:
```bash
python update_2021_batch_and_scrape.py \
  --excel "8thsem_students.xlsx" \
  --url "dummy" \
  --output "8thsem_results.xlsx" \
  --skip-scrape
```

## Database Tables

### Students Table
```sql
CREATE TABLE students (
    usn VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    section VARCHAR(10),
    discipline VARCHAR(50),
    batch INT
);
```

### Results Table
```sql
CREATE TABLE results (
    student_usn VARCHAR(20),
    semester INT,
    subject_code VARCHAR(20),
    subject_name VARCHAR(100),
    internal_marks INT,
    external_marks INT,
    total_marks INT,
    grade VARCHAR(5),
    sgpa DECIMAL(4,2),
    result VARCHAR(20),
    FOREIGN KEY (student_usn) REFERENCES students(usn)
);
```

## Troubleshooting

### Missing Students
If some students are missing after import:
```bash
# Check the Excel file format
# Ensure columns are: USN, NAME, Section, Discipline, BATCH
```

### Scraper Issues
If scraping fails:
```bash
# Check VTU URL is correct
# Ensure internet connection
# Try with smaller batch (5-10 USNs first)
```

### Export Issues
If export fails:
```bash
# Check openpyxl is installed: pip install openpyxl
# Ensure results exist in database for semester 8
```

## Example Workflow

```bash
# 1. Update students
python update_students_from_excel.py --excel "2021_batch_8thsem.xlsx"

# Output:
# ✅ Found 120 students in Excel
# ➕ Inserted: 1BI21IS001 - AARIZ IMAM (Section A)
# ✏️  Updated: 1BI21IS002 - ABHISHEK SINGH (Section A)
# ...
# ✅ COMPLETED!
#    Inserted: 60
#    Updated:  60
#    Errors:   0

# 2. Scrape B section results
python ultimate_scraper.py
# Follow prompts...

# 3. Export to Excel
python export_8thsem_results.py --output "8thsem_final_results.xlsx"

# Output:
# ✅ EXPORT COMPLETED!
#    File: 8thsem_final_results.xlsx
#    Students: 120
```

## Notes

- **Section A**: Students in Excel file will be marked as Section A
- **Section B**: Need to manually mark or they should already be in DB
- **Scraping**: Only scrapes B section students (A section assumed already have results)
- **Export**: Exports ALL students (both A and B sections)
- **SGPA**: Automatically calculated by `calculate_grades.py` if needed

## Post-Processing

After scraping, you may want to recalculate grades:
```bash
python calculate_grades.py --semester 8
```

This ensures all letter grades and SGPAs are correctly calculated.
