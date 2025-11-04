"""
MIGRATION SCRIPT: Update Existing Database with SGPA/CGPA Calculations
========================================================================
This script will:
1. Add new columns to existing tables (if not already present)
2. Calculate letter grades and grade points for all existing results
3. Calculate SGPA for all existing semester records
4. Calculate CGPA for all students
5. Update all statistics (percentage, class grades, backlogs)

Run this ONCE after adding the new schema changes to migrate existing data.

Usage: python migrate_existing_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from db_config import get_db_connection
from statistics import mean
import time

# =============================================================================
# STEP 1: ADD NEW COLUMNS (IF NOT EXISTS)
# =============================================================================

def add_new_columns():
    """Add new columns to tables if they don't exist"""
    print("\n" + "="*70)
    print("STEP 1: Adding New Database Columns")
    print("="*70)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Check and add columns to results table
        print("\nUpdating 'results' table...")
        
        # letter_grade
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'resana' 
            AND TABLE_NAME = 'results' 
            AND COLUMN_NAME = 'letter_grade'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE results
                ADD COLUMN letter_grade VARCHAR(5) DEFAULT NULL COMMENT 'O, A+, A, B+, B, C, P, F'
                AFTER total_marks
            """)
            print("  Added column: letter_grade")
        else:
            print("  Column already exists: letter_grade")
        
        # grade_points
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'resana' 
            AND TABLE_NAME = 'results' 
            AND COLUMN_NAME = 'grade_points'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE results
                ADD COLUMN grade_points INT DEFAULT NULL COMMENT '0-10 grade points'
                AFTER letter_grade
            """)
            print("  Added column: grade_points")
        else:
            print("  Column already exists: grade_points")
        
        # Check and add columns to student_semester_summary table
        print("\nUpdating 'student_semester_summary' table...")
        
        columns_to_add = [
            ("total_marks_obtained", "INT DEFAULT 0 COMMENT 'Sum of all subject marks'"),
            ("total_marks_maximum", "INT DEFAULT 0 COMMENT 'Sum of all subject max marks'"),
            ("percentage", "DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Overall percentage for semester'"),
            ("total_credits", "INT DEFAULT 0 COMMENT 'Total credits for semester'"),
            ("class_grade", "VARCHAR(10) DEFAULT NULL COMMENT 'FCD, FC, SC, P, F'"),
            ("has_backlogs", "BOOLEAN DEFAULT FALSE COMMENT 'Any failed subjects'"),
            ("backlog_count", "INT DEFAULT 0 COMMENT 'Number of failed subjects'"),
            ("calculated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When SGPA was calculated'")
        ]
        
        for col_name, col_definition in columns_to_add:
            cursor.execute(f"""
                SELECT COUNT(*) FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = 'resana' 
                AND TABLE_NAME = 'student_semester_summary' 
                AND COLUMN_NAME = '{col_name}'
            """)
            if cursor.fetchone()[0] == 0:
                cursor.execute(f"""
                    ALTER TABLE student_semester_summary
                    ADD COLUMN {col_name} {col_definition}
                """)
                print(f"  Added column: {col_name}")
            else:
                print(f"  Column already exists: {col_name}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\nDatabase schema updated successfully!")
        return True
        
    except Exception as e:
        print(f"\nError updating schema: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False


# =============================================================================
# STEP 2: CALCULATE LETTER GRADES FOR EXISTING RESULTS
# =============================================================================

def get_letter_grade(total_marks, max_marks=100):
    """Convert total marks to letter grade"""
    if total_marks is None or max_marks == 0:
        return 'F'
    
    percentage = (total_marks / max_marks) * 100
    
    if percentage >= 90:
        return 'O'
    elif percentage >= 80:
        return 'A+'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'B+'
    elif percentage >= 50:
        return 'B'
    elif percentage >= 40:
        return 'C'
    elif percentage >= 35:
        return 'P'
    else:
        return 'F'


def get_grade_points(letter_grade):
    """Convert letter grade to grade points"""
    grade_map = {
        'O': 10, 'A+': 9, 'A': 8, 'B+': 7,
        'B': 6, 'C': 5, 'P': 4, 'F': 0
    }
    return grade_map.get(letter_grade, 0)


def get_subject_max_marks(subject_code, semester, cursor):
    """Determine max marks for a subject (100 or 200)"""
    cursor.execute(
        "SELECT subject_name FROM subjects WHERE subject_code = %s",
        (subject_code,)
    )
    result = cursor.fetchone()
    
    if not result:
        return 100
    
    subject_name = result[0].upper()
    
    # Check for project/internship subjects (usually 200 marks)
    if any(keyword in subject_name for keyword in ['PROJECT', 'INTERNSHIP', 'DISSERTATION']):
        return 200
    
    # Semester 8 major subjects
    if semester == 8 and 'MAJOR' in subject_name:
        return 200
    
    return 100


def update_all_letter_grades():
    """Update letter grades and grade points for ALL existing results"""
    print("\n" + "="*70)
    print("STEP 2: Calculating Letter Grades for Existing Results")
    print("="*70)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Get all results
        cursor.execute("""
            SELECT result_id, subject_code, semester, total_marks
            FROM results
            WHERE total_marks IS NOT NULL
        """)
        results = cursor.fetchall()
        
        total_results = len(results)
        print(f"\nFound {total_results} results to process...")
        
        updated = 0
        batch_size = 100
        
        for i, (result_id, subject_code, semester, total_marks) in enumerate(results, 1):
            # Determine max marks
            max_marks = get_subject_max_marks(subject_code, semester, cursor)
            
            # Calculate grades
            letter_grade = get_letter_grade(total_marks, max_marks)
            grade_points = get_grade_points(letter_grade)
            
            # Update results table
            cursor.execute("""
                UPDATE results
                SET letter_grade = %s, grade_points = %s
                WHERE result_id = %s
            """, (letter_grade, grade_points, result_id))
            
            updated += 1
            
            # Progress indicator
            if updated % batch_size == 0:
                conn.commit()
                progress = (updated / total_results) * 100
                print(f"  Progress: {updated}/{total_results} ({progress:.1f}%) - Last: {subject_code} → {letter_grade}")
        
        conn.commit()
        print(f"\nUpdated letter grades for {updated} results!")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"\nError updating letter grades: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False


# =============================================================================
# STEP 3: CALCULATE SGPA FOR ALL SEMESTERS
# =============================================================================

def get_class_grade(sgpa, has_backlogs):
    """Determine class grade"""
    if has_backlogs or sgpa < 4.0:
        return 'F'
    elif sgpa >= 7.75:
        return 'FCD'
    elif sgpa >= 6.25:
        return 'FC'
    elif sgpa >= 5.0:
        return 'SC'
    else:
        return 'P'


def calculate_all_sgpa():
    """Calculate SGPA for all student-semester combinations"""
    print("\n" + "="*70)
    print("STEP 3: Calculating SGPA for All Semesters")
    print("="*70)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Get all unique student-semester pairs
        cursor.execute("""
            SELECT DISTINCT student_usn, semester
            FROM results
            ORDER BY student_usn, semester
        """)
        pairs = cursor.fetchall()
        
        total_pairs = len(pairs)
        print(f"\nFound {total_pairs} student-semester combinations to process...")
        
        processed = 0
        skipped = 0
        
        for student_usn, semester in pairs:
            # Get all subjects for this student-semester
            cursor.execute("""
                SELECT 
                    r.subject_code,
                    r.total_marks,
                    r.grade_points,
                    r.letter_grade,
                    s.credits
                FROM results r
                LEFT JOIN subjects s ON r.subject_code = s.subject_code
                WHERE r.student_usn = %s AND r.semester = %s
            """, (student_usn, semester))
            
            subjects = cursor.fetchall()
            
            if not subjects:
                continue
            
            # Calculate totals
            total_credits = 0
            total_grade_points_weighted = 0
            total_marks_obtained = 0
            total_marks_maximum = 0
            backlog_count = 0
            has_backlogs = False
            
            missing_credits = []
            
            for subject_code, total_marks, grade_points, letter_grade, credits in subjects:
                if credits is None or credits == 0:
                    missing_credits.append(subject_code)
                    continue
                
                max_marks = get_subject_max_marks(subject_code, semester, cursor)
                
                total_credits += credits
                total_marks_obtained += (total_marks or 0)
                total_marks_maximum += max_marks
                
                if grade_points is not None:
                    total_grade_points_weighted += (grade_points * credits)
                
                if letter_grade == 'F':
                    backlog_count += 1
                    has_backlogs = True
            
            # Skip if no valid credits
            if total_credits == 0:
                skipped += 1
                if skipped <= 5:  # Show first 5 warnings only
                    print(f"  Skipping {student_usn} Sem {semester}: No credit info (missing: {missing_credits})")
                continue
            
            # Calculate SGPA and percentage
            sgpa = round(total_grade_points_weighted / total_credits, 2)
            percentage = round((total_marks_obtained / total_marks_maximum) * 100, 2) if total_marks_maximum > 0 else 0.0
            class_grade = get_class_grade(sgpa, has_backlogs)
            
            # Upsert into student_semester_summary
            cursor.execute("""
                INSERT INTO student_semester_summary 
                (student_usn, semester, sgpa, total_marks_obtained, total_marks_maximum,
                 percentage, total_credits, class_grade, has_backlogs, backlog_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    sgpa = VALUES(sgpa),
                    total_marks_obtained = VALUES(total_marks_obtained),
                    total_marks_maximum = VALUES(total_marks_maximum),
                    percentage = VALUES(percentage),
                    total_credits = VALUES(total_credits),
                    class_grade = VALUES(class_grade),
                    has_backlogs = VALUES(has_backlogs),
                    backlog_count = VALUES(backlog_count),
                    calculated_at = CURRENT_TIMESTAMP
            """, (student_usn, semester, sgpa, total_marks_obtained, total_marks_maximum,
                  percentage, total_credits, class_grade, has_backlogs, backlog_count))
            
            processed += 1
            
            if processed % 50 == 0:
                conn.commit()
                progress = (processed / total_pairs) * 100
                print(f"  Progress: {processed}/{total_pairs} ({progress:.1f}%) - Last: {student_usn} Sem {semester} SGPA={sgpa}")
        
        conn.commit()
        
        if skipped > 5:
            print(f"  ... and {skipped - 5} more students skipped (no credit info)")
        
        print(f"\nCalculated SGPA for {processed} student-semester combinations!")
        if skipped > 0:
            print(f"Skipped {skipped} due to missing credit information")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"\nError calculating SGPA: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False


# =============================================================================
# STEP 4: UPDATE CGPA FOR ALL STUDENTS
# =============================================================================

def update_all_cgpa():
    """Calculate and update CGPA for all students"""
    print("\n" + "="*70)
    print("STEP 4: Updating CGPA for All Students")
    print("="*70)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    try:
        # Get all students with SGPA records
        cursor.execute("""
            SELECT DISTINCT student_usn
            FROM student_semester_summary
        """)
        students = [row[0] for row in cursor.fetchall()]
        
        total_students = len(students)
        print(f"\nFound {total_students} students to process...")
        
        updated = 0
        
        for i, usn in enumerate(students, 1):
            # Get all SGPAs for this student
            cursor.execute("""
                SELECT sgpa
                FROM student_semester_summary
                WHERE student_usn = %s
            """, (usn,))
            
            sgpas = [row[0] for row in cursor.fetchall()]
            
            if not sgpas:
                continue
            
            # Calculate CGPA (mean of all SGPAs)
            cgpa = round(mean(sgpas), 2)
            
            # Update student_details
            cursor.execute("""
                UPDATE student_details
                SET cgpa = %s
                WHERE usn = %s
            """, (cgpa, usn))
            
            updated += 1
            
            if updated % 20 == 0:
                conn.commit()
                progress = (updated / total_students) * 100
                print(f"  Progress: {updated}/{total_students} ({progress:.1f}%) - Last: {usn} CGPA={cgpa}")
        
        conn.commit()
        print(f"\nUpdated CGPA for {updated} students!")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"\nError updating CGPA: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False


# =============================================================================
# STEP 5: GENERATE FINAL REPORT
# =============================================================================

def generate_final_report():
    """Generate summary report of migration"""
    print("\n" + "="*70)
    print("MIGRATION SUMMARY REPORT")
    print("="*70)
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    try:
        # Results with letter grades
        cursor.execute("SELECT COUNT(*) FROM results WHERE letter_grade IS NOT NULL")
        results_with_grades = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM results")
        total_results = cursor.fetchone()[0]
        
        # Students with SGPA
        cursor.execute("SELECT COUNT(DISTINCT student_usn) FROM student_semester_summary")
        students_with_sgpa = cursor.fetchone()[0]
        
        # Students with CGPA
        cursor.execute("SELECT COUNT(*) FROM student_details WHERE cgpa IS NOT NULL")
        students_with_cgpa = cursor.fetchone()[0]
        
        # Average CGPA
        cursor.execute("SELECT AVG(cgpa), MAX(cgpa), MIN(cgpa) FROM student_details WHERE cgpa IS NOT NULL")
        avg_cgpa, max_cgpa, min_cgpa = cursor.fetchone()
        
        # Class grade distribution
        cursor.execute("""
            SELECT class_grade, COUNT(DISTINCT student_usn) as count
            FROM student_semester_summary
            WHERE class_grade IS NOT NULL
            GROUP BY class_grade
            ORDER BY 
                CASE class_grade
                    WHEN 'FCD' THEN 1
                    WHEN 'FC' THEN 2
                    WHEN 'SC' THEN 3
                    WHEN 'P' THEN 4
                    WHEN 'F' THEN 5
                    ELSE 6
                END
        """)
        class_distribution = cursor.fetchall()
        
        # Print report
        print(f"\nRESULTS:")
        print(f"   Total result records: {total_results}")
        print(f"   Results with letter grades: {results_with_grades} ({results_with_grades/total_results*100:.1f}%)")
        
        print(f"\nSTUDENTS:")
        print(f"   Students with SGPA records: {students_with_sgpa}")
        print(f"   Students with CGPA: {students_with_cgpa}")
        
        if avg_cgpa:
            print(f"\nCGPA STATISTICS:")
            print(f"   Average CGPA: {avg_cgpa:.2f}")
            print(f"   Highest CGPA: {max_cgpa:.2f}")
            print(f"   Lowest CGPA: {min_cgpa:.2f}")
        
        if class_distribution:
            print(f"\nCLASS GRADE DISTRIBUTION:")
            for class_grade, count in class_distribution:
                print(f"   {class_grade:<5} : {count:>3} students")
        
        print(f"\n{'='*70}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nError generating report: {e}")
        cursor.close()
        conn.close()


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Run full migration process"""
    print("\n" + "="*70)
    print("DATABASE MIGRATION: SGPA/CGPA CALCULATION")
    print("="*70)
    print("\nThis script will update your existing database with:")
    print("  1. New columns for letter grades and statistics")
    print("  2. Letter grades for all existing results")
    print("  3. SGPA for all student-semester combinations")
    print("  4. CGPA for all students")
    print("\n" + "="*70)
    
    # Confirmation
    response = input("\nProceed with migration? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("\nMigration cancelled by user.")
        return
    
    start_time = time.time()
    
    # Step 1: Add columns
    if not add_new_columns():
        print("\nMigration failed at Step 1 (adding columns)")
        return
    
    # Step 2: Update letter grades
    if not update_all_letter_grades():
        print("\nMigration failed at Step 2 (letter grades)")
        return
    
    # Step 3: Calculate SGPA
    if not calculate_all_sgpa():
        print("\nMigration failed at Step 3 (SGPA)")
        return
    
    # Step 4: Update CGPA
    if not update_all_cgpa():
        print("\nMigration failed at Step 4 (CGPA)")
        return
    
    # Step 5: Generate report
    generate_final_report()
    
    # Done
    elapsed = time.time() - start_time
    print(f"\nMIGRATION COMPLETED SUCCESSFULLY!")
    print(f"Total time: {elapsed:.2f} seconds")
    print(f"\n{'='*70}\n")


if __name__ == '__main__':
    main()
