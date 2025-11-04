# SGPA & CGPA Calculation in Your Codebase

## Overview
Your system has **TWO different calculation methods** depending on where the grades come from:

1. **VTU Results** → Calculate from total marks (out of 100)
2. **Autonomous Results** → Use letter grades directly (O, A+, A, B+, etc.)

---

## Method 1: VTU Results (Total Marks → Grade Points)

### Location
- **File**: `Backend scripts/unwanted code/Preetham version/utils/compute_sgpa.py`
- **Used by**: Post-processing script (manual run after scraping)

### Formula

#### **Grade Points Mapping** (Based on Total Marks out of 100)
```python
def grade_point(total_marks):
    if total_marks >= 90:  return 10  # Outstanding
    if total_marks >= 80:  return 9   # Excellent
    if total_marks >= 70:  return 8   # Very Good
    if total_marks >= 60:  return 7   # Good
    if total_marks >= 50:  return 6   # Above Average
    if total_marks >= 40:  return 5   # Average
    return 0  # Fail (below 40)
```

#### **SGPA Calculation** (Per Semester)
```python
SGPA = Σ(credits × grade_points) / Σ(credits)

Example:
Subject 1: 4 credits, 85 marks → 9 grade points → 4 × 9 = 36
Subject 2: 3 credits, 72 marks → 8 grade points → 3 × 8 = 24
Subject 3: 4 credits, 65 marks → 7 grade points → 4 × 7 = 28

SGPA = (36 + 24 + 28) / (4 + 3 + 4) = 88 / 11 = 8.00
```

#### **CGPA Calculation** (Overall)
```python
CGPA = Mean of all SGPA values

Example:
Semester 1 SGPA: 8.50
Semester 2 SGPA: 7.80
Semester 3 SGPA: 9.00

CGPA = (8.50 + 7.80 + 9.00) / 3 = 8.43
```

### Database Storage
```sql
-- Store SGPA in student_semester_summary table
INSERT INTO student_semester_summary (student_usn, semester, sgpa)
VALUES ('1BI23IS001', 4, 8.50);

-- Store CGPA in student_details table
UPDATE student_details SET cgpa = 8.43 WHERE usn = '1BI23IS001';
```

### Process Flow
```
1. Scraper fetches results → stores in `results` table (total_marks)
2. Manual run: python compute_sgpa.py
3. Script reads results table → calculates grade points
4. Computes SGPA per semester → stores in student_semester_summary
5. Computes CGPA (mean of SGPAs) → updates student_details.cgpa
```

---

## Method 2: Excel Export / Autonomous (Letter Grades → Grade Points)

### Location
- **File**: `Backend scripts/necessary scripts/generate_excel.py`
- **Used by**: Excel export for semester results
- **Also used by**: Autonomous scraper (already has letter grades)

### Formula

#### **Grade Points Mapping** (Based on Letter Grades)
```python
grade_points = {
    'O':  10,  # Outstanding (90-100%)
    'A+': 9,   # Excellent (80-89%)
    'A':  8,   # Very Good (70-79%)
    'B+': 7,   # Good (60-69%)
    'B':  6,   # Above Average (50-59%)
    'C':  5,   # Average (40-49%)
    'P':  4,   # Pass (35-39%)
    'F':  0    # Fail (<35%)
}
```

#### **Total Marks → Letter Grade Conversion**
```python
def get_letter_grade(total_marks, max_marks=200):
    percentage = (total_marks / max_marks) * 100
    
    if percentage >= 90: return 'O'
    if percentage >= 80: return 'A+'
    if percentage >= 70: return 'A'
    if percentage >= 60: return 'B+'
    if percentage >= 50: return 'B'
    if percentage >= 40: return 'C'
    if percentage >= 35: return 'P'
    return 'F'
```

**Note**: Most subjects are 100 marks, but some (like Sem 8 project) are 200 marks.

#### **SGPA Calculation with Class Grade**
```python
def calculate_sgpa_and_class(results):
    total_credits = 0
    total_grade_points = 0
    has_fail = False
    
    for result in results:
        credits = result['credits']
        letter_grade = result['letter_grade']
        
        if letter_grade == 'F':
            has_fail = True
        
        total_credits += credits
        total_grade_points += grade_points[letter_grade] * credits
    
    sgpa = round(total_grade_points / total_credits, 2)
    
    # Class Grade Logic
    if has_fail or sgpa < 4.0:
        class_grade = 'F'      # Fail
    elif sgpa >= 7.75:
        class_grade = 'FCD'    # First Class with Distinction
    elif sgpa >= 6.25:
        class_grade = 'FC'     # First Class
    elif sgpa >= 5.0:
        class_grade = 'SC'     # Second Class
    else:
        class_grade = 'P'      # Pass
    
    return sgpa, class_grade
```

### Class Grade Criteria
| SGPA Range | Class Grade | Full Name |
|------------|-------------|-----------|
| 7.75 - 10.00 | FCD | First Class with Distinction |
| 6.25 - 7.74 | FC | First Class |
| 5.00 - 6.24 | SC | Second Class |
| 4.00 - 4.99 | P | Pass |
| 0.00 - 3.99 or has 'F' | F | Fail |

---

## Key Differences Between Methods

| Feature | Method 1 (compute_sgpa.py) | Method 2 (generate_excel.py) |
|---------|---------------------------|------------------------------|
| **Input** | Total marks (0-100) | Letter grades (O, A+, etc.) |
| **Pass Mark** | 40 marks | 40% (or 35% for 'P' grade) |
| **Fail Grade Points** | 0 | 0 |
| **CGPA Calculation** | Mean of SGPAs | Not calculated (only SGPA) |
| **Class Grade** | Not computed | FCD, FC, SC, P, F |
| **Storage** | Database (student_semester_summary) | Excel file only |
| **Used For** | VTU results processing | Excel reports, Autonomous |

---

## Database Schema

### Results Table (Raw Data)
```sql
CREATE TABLE results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    student_usn VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    internal_marks INT,        -- e.g., 45
    external_marks INT,        -- e.g., 42
    total_marks INT,           -- e.g., 87
    result_status VARCHAR(10), -- e.g., 'PASS', 'FAIL'
    attempt_number INT DEFAULT 1,
    ...
);
```

### Student Semester Summary Table (Computed SGPA)
```sql
CREATE TABLE student_semester_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    student_usn VARCHAR(20) NOT NULL,
    semester INT NOT NULL,     -- e.g., 4
    sgpa DECIMAL(4, 2) NOT NULL, -- e.g., 8.75
    UNIQUE KEY (student_usn, semester)
);
```

### Student Details Table (CGPA Storage)
```sql
CREATE TABLE student_details (
    usn VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cgpa DECIMAL(4, 2),        -- e.g., 8.43 (mean of all SGPAs)
    ...
);
```

---

## Example Calculation Walkthrough

### Student: 1BI23IS001, Semester 4

#### Input Data (from `results` table)
| Subject Code | Subject Name | Credits | Internal | External | Total |
|--------------|--------------|---------|----------|----------|-------|
| BCS401 | Algorithms | 4 | 45 | 42 | 87 |
| BCS402 | Operating Systems | 4 | 38 | 35 | 73 |
| BCS403 | DBMS | 3 | 50 | 48 | 98 |
| BCS404 | Java | 3 | 42 | 40 | 82 |
| BCS405L | OS Lab | 1 | 25 | 23 | 48 |

#### Step 1: Convert Total Marks → Grade Points (Method 1)
| Subject | Total | Grade Points |
|---------|-------|--------------|
| BCS401 | 87 | 9 (80-89) |
| BCS402 | 73 | 8 (70-79) |
| BCS403 | 98 | 10 (90-100) |
| BCS404 | 82 | 9 (80-89) |
| BCS405L | 48 | 6 (40-49) |

#### Step 2: Calculate SGPA
```
SGPA = Σ(credits × grade_points) / Σ(credits)

Numerator:
  BCS401:  4 × 9  = 36
  BCS402:  4 × 8  = 32
  BCS403:  3 × 10 = 30
  BCS404:  3 × 9  = 27
  BCS405L: 1 × 6  = 6
  ----------------------
  Total = 131

Denominator:
  4 + 4 + 3 + 3 + 1 = 15 credits

SGPA = 131 / 15 = 8.73
```

#### Step 3: Store in Database
```sql
INSERT INTO student_semester_summary (student_usn, semester, sgpa)
VALUES ('1BI23IS001', 4, 8.73);
```

#### Step 4: Calculate CGPA (if student has multiple semesters)
```sql
-- Get all SGPAs
SELECT sgpa FROM student_semester_summary WHERE student_usn = '1BI23IS001';
-- Result: [8.50, 7.80, 9.00, 8.73]

CGPA = (8.50 + 7.80 + 9.00 + 8.73) / 4 = 8.51

UPDATE student_details SET cgpa = 8.51 WHERE usn = '1BI23IS001';
```

---

## When Are These Calculations Run?

### Automatic (During Scraping)
- ❌ **SGPA/CGPA NOT calculated during scraping**
- ✅ Only `total_marks`, `internal_marks`, `external_marks` stored in `results` table

### Manual (Post-Scraping)
1. **compute_sgpa.py**: Run after scraping to calculate SGPA/CGPA
2. **generate_excel.py**: Run on-demand to export semester results

### Command to Calculate SGPA/CGPA
```bash
cd "Backend scripts/unwanted code/Preetham version/utils"
python compute_sgpa.py
```

---

## Potential Issues & Recommendations

### ⚠️ Issue 1: Two Different Grade Point Systems
- **Problem**: `compute_sgpa.py` uses 0-10 scale, but 40 marks = 5 points (average)
- **Problem**: `generate_excel.py` uses letter grades with P=4 points (35-39%)
- **Impact**: Same marks get different grade points!

**Example**: 38 marks
- Method 1: 0 grade points (below 40)
- Method 2: 'P' grade = 4 grade points (35-39%)

### ⚠️ Issue 2: CGPA Calculation Not Automated
- **Problem**: Must manually run `compute_sgpa.py` after each scraping session
- **Recommendation**: Integrate SGPA/CGPA calculation into scraper pipeline

### ⚠️ Issue 3: Class Grade Not Stored in Database
- **Problem**: `generate_excel.py` computes FCD/FC/SC/P/F but doesn't store it
- **Recommendation**: Add `class_grade` column to `student_semester_summary` table

### ✅ Recommendation: Unified Calculation
Create a single SGPA/CGPA calculation function that:
1. Uses consistent grade point mapping (decide: marks-based or grade-based)
2. Runs automatically after scraping (or as part of scraper)
3. Stores both SGPA and class grade in database
4. Computes CGPA incrementally

---

## Summary

**Your current system:**
- ✅ Scrapers collect raw marks (internal, external, total)
- ✅ Stores in `results` table
- ⚠️ SGPA/CGPA calculation is **manual** (run `compute_sgpa.py`)
- ⚠️ Two different calculation methods exist (marks-based vs grade-based)
- ✅ CGPA = mean of all semester SGPAs
- ✅ Grade points: 0-10 scale (fail=0, outstanding=10)

**Key Formula:**
```
SGPA = Σ(credits × grade_points) / Σ(credits)
CGPA = mean(all SGPAs)
```
