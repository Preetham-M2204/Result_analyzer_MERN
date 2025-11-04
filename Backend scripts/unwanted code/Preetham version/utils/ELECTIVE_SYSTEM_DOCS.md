# Elective Subject Handling System

## Overview
This document explains how the system handles **elective/optional subjects** in the 21 Scheme curriculum.

## The Problem

In VTU's 21 Scheme, some subjects are **electives** where students choose from multiple options:

### Example: Semester 4 - Ability Enhancement Course IV
- **Subject Master (Database)**: `21CS48LX` (placeholder)
- **Student A chose**: `21CSL481` - Web Programming (actual)
- **Student B chose**: `21CSL482` - Unix Shell Programming (actual)  
- **Student C chose**: `21CSL483` - Advanced Java Programming (actual)

### The Challenge
When scraping VTU results:
1. VTU shows actual codes: `21CSL481`, `21CSL482`, `21CSL483`
2. Subject master has placeholder: `21CS48LX`
3. Need to:
   - Map actual → placeholder
   - Store student's actual choice
   - Use correct credits for SGPA
   - Mark as elective

## Database Schema

### 1. `subjects` Table
Stores **both** regular subjects and elective placeholders:

```sql
CREATE TABLE subjects (
    subject_code VARCHAR(50) PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    semester INT NOT NULL,
    credits INT NOT NULL,
    scheme VARCHAR(10) DEFAULT '22',
    is_placeholder BOOLEAN DEFAULT FALSE,  -- TRUE for 21CS48LX, FALSE for regular
    ...
);
```

**Example entries**:
```
21CS42  | Design and Analysis of Algorithms | 4 | 4 | 21 | FALSE
21CS48LX | Ability Enhancement Course - IV  | 4 | 1 | 21 | TRUE (placeholder)
```

### 2. `elective_subjects` Table
Stores **actual** elective options students chose:

```sql
CREATE TABLE elective_subjects (
    subject_code VARCHAR(50) PRIMARY KEY,     -- Actual: 21CSL481
    subject_name VARCHAR(255) NOT NULL,       -- Web Programming
    semester INT NOT NULL,                    -- 4
    credits INT NOT NULL,                     -- 1
    placeholder_code VARCHAR(50),             -- 21CS48LX
    scheme VARCHAR(10) DEFAULT '21',
    ...
);
```

**Example entries**:
```
21CSL481 | Web Programming          | 4 | 1 | 21CS48LX | 21
21CSL482 | Unix Shell Programming   | 4 | 1 | 21CS48LX | 21
21CSL483 | Advanced Java Programming| 4 | 1 | 21CS48LX | 21
```

### 3. `results` Table
Stores **actual** subject codes (what student chose):

```sql
ALTER TABLE results 
ADD COLUMN is_elective BOOLEAN DEFAULT FALSE;
```

**Example entries**:
```
1BI21CS001 | 21CSL481 | 4 | 18 | 75 | 93 | P | 1 | TRUE  -- Student chose Web Programming
1BI21CS002 | 21CSL482 | 4 | 19 | 78 | 97 | P | 1 | TRUE  -- Student chose Unix Shell
1BI21CS003 | 21CS42   | 4 | 20 | 80 | 100| P | 1 | FALSE -- Regular subject (DAA)
```

## Elective Mapping Patterns

### Defined in `elective_subjects_mapper.py`

```python
ELECTIVE_PATTERNS = {
    "21CS48LX": {
        "pattern": r"21CSL48[0-9]",  # Matches 21CSL481, 21CSL482, 21CSL483, etc.
        "semester": 4,
        "credits": 1,
        "type": "Ability Enhancement Course - IV"
    },
    "21XX64X": {
        "pattern": r"21[A-Z]{2,4}64[0-9]",  # Matches 21CS641, 21AI642, 21IS643, etc.
        "semester": 6,
        "credits": 3,
        "type": "Professional Elective Course-I"
    },
    # ... 9 total patterns
}
```

### All Elective Patterns (21 Scheme)

| Semester | Placeholder | Pattern | Type | Credits |
|----------|-------------|---------|------|---------|
| 3 | 21CS38X | `21CS38[0-9]` | Ability Enhancement Course III | 1 |
| 3 | 21CSL38X | `21CSL38[0-9]` | Ability Enhancement Course III | 1 |
| 4 | 21CS48X | `21CS48[0-9]` | Ability Enhancement Course IV | 1 |
| 4 | 21CS48LX | `21CSL48[0-9]` | Ability Enhancement Course IV | 1 |
| 5 | 21XX56 | `21[A-Z]{2,4}56` | Research Methodology and IPR | 2 |
| 5 | 21CS58X | `21CS58[0-9]` | Ability Enhancement Course V | 1 |
| 5 | 21CSL58X | `21CSL58[0-9]` | Ability Enhancement Course V | 1 |
| 6 | 21XX64X | `21[A-Z]{2,4}64[0-9]` | Professional Elective Course I | 3 |
| 6 | 21XX65X | `21[A-Z]{2,4}65[0-9]` | Open Elective Course I | 3 |
| 7 | 21XX73X | `21[A-Z]{2,4}73[0-9]` | Professional Elective Course II | 3 |
| 7 | 21XX74X | `21[A-Z]{2,4}74[0-9]` | Professional Elective Course III | 3 |
| 7 | 21XX75X | `21[A-Z]{2,4}75[0-9]` | Open Elective Course II | 3 |

## Scraper Workflow

### Using `scrape_vtu_results_electives.py`

```python
from elective_subjects_mapper import map_actual_to_placeholder

# Scrape VTU results
actual_subject_code = "21CSL481"  # What VTU shows
actual_subject_name = "Web Programming"

# Check if elective
placeholder, elective_type, credits = map_actual_to_placeholder(actual_subject_code)

if placeholder:
    # ✅ This is an ELECTIVE
    print(f"Elective: {actual_subject_code} → {placeholder}")
    
    # 1. Store in elective_subjects (actual choice)
    INSERT INTO elective_subjects (subject_code, subject_name, semester, credits, placeholder_code)
    VALUES ('21CSL481', 'Web Programming', 4, 1, '21CS48LX')
    
    # 2. Store in results (with is_elective = TRUE)
    INSERT INTO results (..., subject_code, ..., is_elective)
    VALUES (..., '21CSL481', ..., TRUE)

else:
    # ❌ Regular subject
    INSERT INTO results (..., subject_code, ..., is_elective)
    VALUES (..., '21CS42', ..., FALSE)
```

### Key Functions

#### `map_actual_to_placeholder(subject_code)`
Maps actual subject code to placeholder:

```python
>>> map_actual_to_placeholder("21CSL481")
('21CS48LX', 'Ability Enhancement Course - IV', 1)

>>> map_actual_to_placeholder("21CS641")
('21XX64X', 'Professional Elective Course-I', 3)

>>> map_actual_to_placeholder("21CS42")
(None, None, None)  # Not an elective
```

## SGPA Calculation with Electives

### Important Rules

1. **Use actual subject's credits** (not placeholder)
2. **Get subject name from student's choice** (not placeholder)
3. **Filter by `is_elective = FALSE`** for mandatory subjects

### Example Query

```sql
-- Get SGPA for semester 4 (21 scheme student)
SELECT 
    r.subject_code,
    COALESCE(es.subject_name, s.subject_name) as subject_name,  -- Use actual elective name
    COALESCE(es.credits, s.credits) as credits,                  -- Use actual credits
    r.total_marks,
    r.is_elective
FROM results r
LEFT JOIN subjects s ON r.subject_code = s.subject_code
LEFT JOIN elective_subjects es ON r.subject_code = es.subject_code  -- Join for electives
WHERE r.student_usn = '1BI21CS001' AND r.semester = 4
ORDER BY r.is_elective, r.subject_code;
```

**Output**:
```
21CS41   | Mathematical Foundations | 3 | 95  | FALSE (regular)
21CS42   | Design and Analysis      | 4 | 98  | FALSE (regular)
21CS43   | Microcontroller          | 4 | 92  | FALSE (regular)
21CSL481 | Web Programming          | 1 | 93  | TRUE  (elective - student chose this)
```

## Testing

### Test Elective Mapping

```bash
cd "d:\preetham\scrapper\Preetham version\utils"
python elective_subjects_mapper.py
```

**Expected output**:
```
✅ 21CSL481 → 21CS48LX (Ability Enhancement Course - IV, 1 credits)
✅ 21CSL482 → 21CS48LX (Ability Enhancement Course - IV, 1 credits)
✅ 21CS641 → 21XX64X (Professional Elective Course-I, 3 credits)
❌ 21CS301 → Not an elective
```

### Test Scraper with Electives

```bash
python scrape_vtu_results_electives.py
```

## Files Created

1. **`elective_subjects_mapper.py`** - Mapping logic + database setup
2. **`scrape_vtu_results_electives.py`** - Enhanced scraper
3. **`import_21_scheme_subjects.py`** - Import with elective awareness
4. **`ELECTIVE_SYSTEM_DOCS.md`** - This documentation

## Database Summary

After setup:
```
subjects table:          103 total (42 scheme-22 + 52 regular scheme-21 + 9 placeholders scheme-21)
elective_subjects table: 0 initially (populated during scraping)
results table:           Has is_elective column (TRUE/FALSE)
student_details:         279 students (210 scheme-22, 69 scheme-21)
```

## Current Status

✅ Database schema updated (is_placeholder, is_elective columns)
✅ Elective mapping patterns defined (9 patterns)
✅ 21 scheme subjects imported (52 regular + 9 placeholders)
✅ Scraper enhanced to handle electives
⏳ Ready to scrape 21-scheme students

## Next Steps

1. Test scraper with 21-scheme student USN
2. Verify elective choices are stored correctly
3. Test SGPA calculation with electives
4. Batch scrape all 21-scheme students
5. Generate reports showing students' elective choices

---

**Last Updated**: Auto-generated during import
**Scheme**: VTU 21 Scheme (2021-2025 batch)
**Total Elective Slots**: 9 (Sem 3-7)
