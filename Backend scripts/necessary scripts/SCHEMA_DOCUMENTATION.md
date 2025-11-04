# VTU Results Scraper - Database Schema Documentation

## 📋 Overview

This database is designed to store academic data scraped from the VTU results portal. It follows **normalized database design principles** to avoid data redundancy and ensure data integrity.

---

## 📊 Database Tables

### 1. `student_details` - Student Master Table

Stores one row for each unique student.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `usn` | VARCHAR(20) | **Primary Key** - University Seat Number (unique, never changes) | `1CR21CS001` |
| `name` | VARCHAR(100) | Student's full name | `JOHN DOE` |
| `gender` | ENUM | Male, Female, or Other | `Male` |
| `batch` | INT | Year of joining | `2021` |
| `discipline` | ENUM | VTU or Autonomous | `VTU` |
| `dob` | DATE | Date of birth (optional) | `2003-05-15` |
| `section` | VARCHAR(5) | Class section | `A`, `CS1` |
| `cgpa` | DECIMAL(4,2) | Cumulative Grade Point Average | `9.75` |

**Why USN is the perfect Primary Key:**
- ✅ Unique for every student (VTU ensures this)
- ✅ Never changes throughout the student's academic career
- ✅ Automatically indexed (Primary keys are auto-indexed)
- ✅ Sequential/ordered (e.g., 1CR21CS001, 1CR21CS002)

---

### 2. `subjects` - Subject Master Table

The master list of all subjects taught.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `subject_code` | VARCHAR(20) | **Primary Key** - Official VTU subject code | `BCS401` |
| `subject_name` | VARCHAR(255) | Full subject name | `ANALYSIS & DESIGN OF ALGORITHMS` |
| `semester` | INT | Which semester this subject belongs to | `3`, `4` |
| `credits` | INT | Credit hours for the subject (needed for SGPA calculation) | `3`, `4` |
| `short_code` | VARCHAR(10) | Your internal/custom code | `401`, `pek359` |

**Why credits are stored here:**
- Credits are a **subject property**, not a result property
- All students taking this subject will have the same credits
- Avoids data duplication

---

### 3. `teachers` - Teacher Master Table

The master list of all teachers.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `teacher_id` | VARCHAR(20) | **Primary Key** - Unique teacher identifier | `T-101`, `FAC001` |
| `teacher_name` | VARCHAR(100) | Teacher's full name | `Dr. Smith` |

---

### 4. `teacher_subject_assignments` - Teacher-Subject Junction Table

Links teachers to the subjects they handle (many-to-many relationship).

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `assignment_id` | INT | **Primary Key** - Auto-incremented unique ID | `1`, `2`, `3` |
| `teacher_id` | VARCHAR(20) | **Foreign Key** → `teachers.teacher_id` | `T-101` |
| `subject_code` | VARCHAR(20) | **Foreign Key** → `subjects.subject_code` | `BCS401` |
| `batch` | INT | Which batch was taught | `2021` |
| `section` | VARCHAR(5) | Which section was taught | `A`, `B` |

**Example Scenario:**
- Teacher T-101 teaches BCS401 to Batch 2021, Section A
- Teacher T-102 teaches BCS401 to Batch 2021, Section B
- Teacher T-101 also teaches BCS402 to Batch 2021, Section A

---

### 5. `results` - Student Results Table (MAIN DATA TABLE)

This **ONE table** stores all results for **ALL semesters** (long format).

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `result_id` | INT | **Primary Key** - Auto-incremented unique ID | `1`, `2`, `3` |
| `student_usn` | VARCHAR(20) | **Foreign Key** → `student_details.usn` | `1CR21CS001` |
| `subject_code` | VARCHAR(20) | **Foreign Key** → `subjects.subject_code` | `BCS401` |
| `semester` | INT | Which semester this result belongs to | `3`, `4`, `5` |
| `internal_marks` | INT | Internal assessment marks | `18`, `20` |
| `external_marks` | INT | External exam marks | `65`, `70` |
| `total_marks` | INT | Sum of internal + external | `83`, `90` |
| `result_status` | VARCHAR(10) | Pass/Fail status | `PASS`, `FAIL`, `FCD`, `SC` |
| `attempt_number` | INT | Track retakes (default: 1) | `1`, `2`, `3` |
| `scraped_at` | TIMESTAMP | When this data was scraped | `2025-10-24 10:30:00` |

**Why `semester` is stored here (even though it's in `subjects` table):**

#### ❌ Without semester in results:
```sql
-- Always need a JOIN (slower)
SELECT * FROM results r 
JOIN subjects s ON r.subject_code = s.subject_code 
WHERE s.semester = 3;
```

#### ✅ With semester in results:
```sql
-- Direct query (faster)
SELECT * FROM results WHERE semester = 3;
```

#### Real-World Edge Case (Retakes):
| student_usn | subject_code | semester | result_status | attempt_number |
|-------------|--------------|----------|---------------|----------------|
| 1CR21CS001  | BCS401       | 3        | FAIL          | 1              |
| 1CR21CS001  | BCS401       | 5        | PASS          | 2              |

**Student failed BCS401 in Sem 3, retook it in Sem 5**

Without the `semester` column in results, you couldn't track this accurately!

---

### 6. `student_semester_summary` - Semester-wise SGPA Summary

Stores pre-calculated SGPA for each student per semester (improves query performance).

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `summary_id` | INT | **Primary Key** - Auto-incremented unique ID | `1`, `2`, `3` |
| `student_usn` | VARCHAR(20) | **Foreign Key** → `student_details.usn` | `1CR21CS001` |
| `semester` | INT | Which semester this SGPA is for | `3`, `4` |
| `sgpa` | DECIMAL(4,2) | Semester Grade Point Average | `8.75`, `9.12` |

**Note:** `UNIQUE KEY (student_usn, semester)` ensures a student can only have **one SGPA entry per semester**.

---

## 🔗 Database Relationships (ER Diagram)

```
student_details (1) ----< (M) results (M) >---- (1) subjects
     |                                               |
     |                                               |
     v                                               v
student_semester_summary          teacher_subject_assignments
                                            |
                                            v
                                        teachers
```

### Relationships:
- One student → Many results (One-to-Many)
- One subject → Many results (One-to-Many)
- One student → Many semester summaries (One-to-Many)
- Teachers ↔ Subjects (Many-to-Many via `teacher_subject_assignments`)

---

## 🚀 Common Queries

### Get all Semester 3 results with subject details:
```sql
SELECT 
    r.student_usn,
    r.subject_code,
    s.subject_name,
    s.credits,
    r.internal_marks,
    r.external_marks,
    r.total_marks,
    r.result_status
FROM results r
JOIN subjects s ON r.subject_code = s.subject_code
WHERE r.student_usn = '1CR21CS001' 
  AND r.semester = 3;
```

### Get student's complete academic history:
```sql
SELECT 
    sd.usn,
    sd.name,
    sd.batch,
    r.semester,
    r.subject_code,
    s.subject_name,
    r.total_marks,
    r.result_status,
    sss.sgpa
FROM student_details sd
JOIN results r ON sd.usn = r.student_usn
JOIN subjects s ON r.subject_code = s.subject_code
LEFT JOIN student_semester_summary sss 
    ON sd.usn = sss.student_usn 
    AND r.semester = sss.semester
WHERE sd.usn = '1CR21CS001'
ORDER BY r.semester, s.subject_code;
```

### Calculate SGPA for a semester:
```sql
SELECT 
    student_usn,
    semester,
    SUM(
        CASE 
            WHEN result_status = 'PASS' THEN 
                (total_marks / 10) * s.credits 
            ELSE 0 
        END
    ) / SUM(s.credits) AS calculated_sgpa
FROM results r
JOIN subjects s ON r.subject_code = s.subject_code
WHERE student_usn = '1CR21CS001' AND semester = 3
GROUP BY student_usn, semester;
```

### Find students who failed any subject:
```sql
SELECT DISTINCT 
    sd.usn, 
    sd.name, 
    r.subject_code, 
    s.subject_name,
    r.semester
FROM student_details sd
JOIN results r ON sd.usn = r.student_usn
JOIN subjects s ON r.subject_code = s.subject_code
WHERE r.result_status = 'FAIL'
ORDER BY sd.usn, r.semester;
```

### Get top 10 students by CGPA:
```sql
SELECT usn, name, batch, section, cgpa
FROM student_details
WHERE cgpa IS NOT NULL
ORDER BY cgpa DESC
LIMIT 10;
```

---

## 📝 Indexes & Performance

### Automatically Indexed (Primary Keys):
- `student_details.usn`
- `subjects.subject_code`
- `teachers.teacher_id`
- `teacher_subject_assignments.assignment_id`
- `results.result_id`
- `student_semester_summary.summary_id`

### Manually Created Indexes (in `results` table):
- `idx_semester` - Fast filtering by semester
- `idx_result_status` - Fast filtering by pass/fail

### Foreign Key Indexes:
MySQL automatically indexes foreign keys, so these are already optimized:
- `results.student_usn`
- `results.subject_code`
- `teacher_subject_assignments.teacher_id`
- `teacher_subject_assignments.subject_code`

---

## 💡 Design Decisions

### Why normalize instead of storing everything in one table?
- ✅ **Avoids data duplication** (e.g., student name appears only once)
- ✅ **Easier to update** (change a subject name in one place)
- ✅ **Data integrity** (foreign keys prevent invalid references)
- ✅ **Flexible queries** (can analyze by student, subject, teacher, etc.)

### Why store `semester` in both `subjects` and `results`?
- `subjects.semester` = "This subject is normally taught in semester X"
- `results.semester` = "This student took this subject in semester Y"
- **They can be different** (due to retakes or special cases)

### Why pre-calculate SGPA in `student_semester_summary`?
- **Performance**: Calculating SGPA on-the-fly requires complex aggregations
- **Efficiency**: Store once, query many times
- **Consistency**: Ensures everyone uses the same calculation method

---

## 🛠️ Setup Instructions

1. **Create the database:**
   ```sql
   CREATE DATABASE vtu_results_scraper;
   USE vtu_results_scraper;
   ```

2. **Execute the schema:**
   ```bash
   mysql -u root -p vtu_results_scraper < database_schema.sql
   ```

3. **Verify tables were created:**
   ```sql
   SHOW TABLES;
   ```

---

## 📦 Sample Data Insertion

```sql
-- Insert a student
INSERT INTO student_details VALUES 
('1CR21CS001', 'JOHN DOE', 'Male', 2021, 'VTU', '2003-05-15', 'A', 9.75);

-- Insert a subject
INSERT INTO subjects VALUES 
('BCS401', 'ANALYSIS & DESIGN OF ALGORITHMS', 3, 4, '401');

-- Insert a teacher
INSERT INTO teachers VALUES 
('T-101', 'Dr. Smith');

-- Link teacher to subject
INSERT INTO teacher_subject_assignments VALUES 
(NULL, 'T-101', 'BCS401', 2021, 'A');

-- Insert a result
INSERT INTO results VALUES 
(NULL, '1CR21CS001', 'BCS401', 3, 18, 65, 83, 'PASS', 1, NOW());

-- Insert semester summary
INSERT INTO student_semester_summary VALUES 
(NULL, '1CR21CS001', 3, 8.75);
```

---

## 🎯 Next Steps

1. ✅ Execute `database_schema.sql` to create tables
2. 🔄 Build your Python scraper to populate data
3. 📊 Create views/stored procedures for complex queries
4. 🔒 Add user authentication and access control
5. 📈 Build a dashboard/web interface

---

**Last Updated:** October 24, 2025
