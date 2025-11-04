-- =============================================================================
-- VTU RESULTS SCRAPER - DATABASE SCHEMA
-- =============================================================================
-- See SCHEMA_DOCUMENTATION.md for detailed documentation and design decisions
-- =============================================================================

-- 1. Student Details Table
CREATE TABLE student_details (
    usn VARCHAR(20) PRIMARY KEY,        -- e.g., '1CR21CS001'
    name VARCHAR(100) NOT NULL,         -- Student's full name
    gender ENUM('Male', 'Female', 'Other'),
    batch INT NOT NULL,                 -- Year joined, e.g., 2021
    discipline ENUM('VTU', 'Autonomous') NOT NULL,
    scheme VARCHAR(10) DEFAULT '22',    -- Scheme: '21' or '22'
    dob DATE NULL,                      -- Date of birth (optional)
    section VARCHAR(5),                 -- e.g., 'A', 'CS1'
    cgpa DECIMAL(4, 2)                  -- e.g., 9.75
);

-- 2. Subjects Table
CREATE TABLE subjects (
    subject_code VARCHAR(20) PRIMARY KEY,   -- e.g., 'BCS401'
    subject_name VARCHAR(255) NOT NULL,     -- e.g., 'ANALYSIS & DESIGN OF ALGORITHMS'
    semester INT NOT NULL,                  -- e.g., 3, 4
    scheme VARCHAR(10) DEFAULT '22',        -- Scheme: '21' or '22'
    credits INT NOT NULL,                   -- e.g., 3, 4 (for SGPA calculation)
    short_code VARCHAR(10)                  -- Internal code, e.g., '401'
);

-- 3. Teachers Table
CREATE TABLE teachers (
    teacher_id VARCHAR(20) PRIMARY KEY,     -- e.g., 'T-101'
    teacher_name VARCHAR(100) NOT NULL
);

-- 4. Teacher-Subject Assignment Table (Junction Table)
CREATE TABLE teacher_subject_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    batch INT NOT NULL,                     -- e.g., 2021
    section VARCHAR(5),                     -- e.g., 'A'
    
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code)
);

-- 5. Results Table (Main data table - stores all semester results)
CREATE TABLE results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    student_usn VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    semester INT NOT NULL,                  -- Which semester this result belongs to
    internal_marks INT,                     -- Internal assessment marks
    external_marks INT,                     -- External exam marks
    total_marks INT,                        -- Sum of internal + external
    letter_grade VARCHAR(5) DEFAULT NULL,   -- Letter grade: O, A+, A, B+, B, C, P, F
    grade_points INT DEFAULT NULL,          -- Grade points 0-10 for SGPA calculation
    result_status VARCHAR(10),              -- e.g., 'PASS', 'FAIL', 'FCD', 'SC'
    is_elective TINYINT(1) DEFAULT 0,       -- 1 if elective subject, 0 if core
    attempt_number INT DEFAULT 1,           -- For retakes (1, 2, 3...)
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_usn) REFERENCES student_details(usn),
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
    
    INDEX idx_semester (semester),
    INDEX idx_result_status (result_status),
    INDEX idx_letter_grade (letter_grade)
);

-- 6. Student Semester Summary Table (Pre-calculated SGPA and semester statistics)
CREATE TABLE student_semester_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    student_usn VARCHAR(20) NOT NULL,
    semester INT NOT NULL,                      -- Which semester (1-8)
    sgpa DECIMAL(4, 2) NOT NULL,               -- Semester GPA: e.g., 8.75
    total_marks_obtained INT DEFAULT 0,         -- Sum of all subject marks obtained
    total_marks_maximum INT DEFAULT 0,          -- Sum of all subject maximum marks (handles 200-mark subjects)
    percentage DECIMAL(5, 2) DEFAULT 0.00,     -- Overall percentage for semester
    total_credits INT DEFAULT 0,                -- Total credits for semester
    class_grade VARCHAR(10) DEFAULT NULL,       -- Class grade: FCD, FC, SC, P, F
    has_backlogs BOOLEAN DEFAULT FALSE,         -- TRUE if student has any failed subjects
    backlog_count INT DEFAULT 0,                -- Number of failed subjects in this semester
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- When SGPA was last calculated
    
    FOREIGN KEY (student_usn) REFERENCES student_details(usn),
    UNIQUE KEY (student_usn, semester),
    INDEX idx_sgpa (sgpa),
    INDEX idx_class_grade (class_grade)
);
