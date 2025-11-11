"""
AUTO SGPA/CGPA CALCULATOR
=========================
Automatically calculates SGPA, CGPA, letter grades, and class grades
after a scraping session completes.

This script:
1. Calculates letter grades from total marks for each subject
2. Assigns grade points (0-10 scale)
3. Computes SGPA per semester per student
4. Computes overall percentage and total marks
5. Assigns class grades (FCD, FC, SC, P, F)
6. Updates CGPA in student_details table

Run after scraping: python calculate_grades.py --semester 4
Or auto-run: Called by FastAPI after scraping completes
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from db_config import get_db_connection
from statistics import mean
import argparse

# =============================================================================
# GRADE CALCULATION LOGIC
# =============================================================================

def get_letter_grade(total_marks, max_marks=100):
    """
    Convert total marks to letter grade based on percentage
    
    Args:
        total_marks: Marks obtained
        max_marks: Maximum marks for subject (usually 100, sometimes 200)
    
    Returns:
        Letter grade: O, A+, A, B+, B, C, P, F
    """
    if total_marks is None or max_marks == 0:
        return 'F'
    
    percentage = (total_marks / max_marks) * 100
    
    if percentage >= 90:
        return 'O'   # Outstanding
    elif percentage >= 80:
        return 'A+'  # Excellent
    elif percentage >= 70:
        return 'A'   # Very Good
    elif percentage >= 60:
        return 'B+'  # Good
    elif percentage >= 50:
        return 'B'   # Above Average
    elif percentage >= 40:
        return 'C'   # Average
    elif percentage >= 35:
        return 'P'   # Pass
    else:
        return 'F'   # Fail


def get_grade_points(letter_grade):
    """
    Convert letter grade to grade points (0-10 scale)
    
    Args:
        letter_grade: O, A+, A, B+, B, C, P, F
    
    Returns:
        Grade points: 0-10
    """
    grade_map = {
        'O': 10,
        'A+': 9,
        'A': 8,
        'B+': 7,
        'B': 6,
        'C': 5,
        'P': 4,
        'F': 0
    }
    return grade_map.get(letter_grade, 0)


def get_class_grade(sgpa, has_backlogs):
    """
    Determine class grade based on SGPA and backlog status
    
    Args:
        sgpa: Semester GPA (0-10)
        has_backlogs: True if student has any failed subjects
    
    Returns:
        Class grade: FCD, FC, SC, P, F
    """
    if has_backlogs or sgpa < 4.0:
        return 'F'      # Fail
    elif sgpa >= 7.75:
        return 'FCD'    # First Class with Distinction
    elif sgpa >= 6.25:
        return 'FC'     # First Class
    elif sgpa >= 5.0:
        return 'SC'     # Second Class
    else:
        return 'P'      # Pass


def get_subject_max_marks(subject_code, semester, cursor):
    """
    Determine maximum marks for a subject (usually 100, some are 200)
    
    Strategy:
    1. Check for actual major project/internship subjects → 200 marks
    2. Semester 8 major project → 200 marks
    3. Default → 100 marks
    
    Note: "Mini Project" and subjects with "Project Management" in name are 100 marks
    
    Args:
        subject_code: Subject code (e.g., 'BCS801')
        semester: Semester number
        cursor: Database cursor
    
    Returns:
        Maximum marks: 100 or 200
    """
    # Query subject name
    cursor.execute(
        "SELECT subject_name FROM subjects WHERE subject_code = %s",
        (subject_code,)
    )
    result = cursor.fetchone()
    
    if not result:
        return 100  # Default
    
    subject_name = result[0].upper()
    
    # Check for actual major projects/internships (200 marks)
    # Be specific to avoid matching "Project Management" or "Mini Project"
    if any(keyword in subject_name for keyword in ['MAJOR PROJECT', 'INTERNSHIP', 'DISSERTATION']):
        return 200
    
    # Semester 8 major subjects are often 200 marks
    if semester == 8 and 'MAJOR' in subject_name:
        return 200
    
    return 100  # Default for regular subjects (including Mini Project, Project Management, etc.)


# =============================================================================
# STEP 1: UPDATE LETTER GRADES IN RESULTS TABLE
# =============================================================================

def update_letter_grades(semester, cursor, conn):
    """
    Update letter_grade and grade_points columns in results table
    for all subjects in a given semester
    """
    print(f"\n{'='*60}")
    print(f"STEP 1: Updating Letter Grades for Semester {semester}")
    print(f"{'='*60}")
    
    # Get all results for this semester
    cursor.execute("""
        SELECT result_id, subject_code, semester, total_marks, student_usn
        FROM results
        WHERE semester = %s AND total_marks IS NOT NULL
    """, (semester,))
    
    results = cursor.fetchall()
    print(f"Found {len(results)} subject results to process")
    
    updated = 0
    for result_id, subject_code, sem, total_marks, usn in results:
        # Determine max marks for this subject
        max_marks = get_subject_max_marks(subject_code, sem, cursor)
        
        # Calculate letter grade
        letter_grade = get_letter_grade(total_marks, max_marks)
        grade_points = get_grade_points(letter_grade)
        
        # Update results table
        cursor.execute("""
            UPDATE results
            SET letter_grade = %s, grade_points = %s
            WHERE result_id = %s
        """, (letter_grade, grade_points, result_id))
        
        updated += 1
        if updated % 50 == 0:
            print(f"  Processed {updated} results...")
    
    conn.commit()
    print(f"✅ Updated letter grades for {updated} results")


# =============================================================================
# STEP 2: CALCULATE SGPA PER STUDENT PER SEMESTER
# =============================================================================

def calculate_sgpa(semester, cursor, conn):
    """
    Calculate SGPA, percentage, class grade for all students in a semester
    and store in student_semester_summary table
    """
    print(f"\n{'='*60}")
    print(f"STEP 2: Calculating SGPA for Semester {semester}")
    print(f"{'='*60}")
    
    # Get all distinct students for this semester
    cursor.execute("""
        SELECT DISTINCT student_usn
        FROM results
        WHERE semester = %s
    """, (semester,))
    
    students = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(students)} students to process")
    
    processed = 0
    for usn in students:
        # Get all subject results for this student in this semester (LATEST ATTEMPT ONLY)
        cursor.execute("""
            SELECT 
                r.subject_code,
                r.total_marks,
                r.grade_points,
                r.letter_grade,
                s.credits
            FROM results r
            LEFT JOIN subjects s ON r.subject_code = s.subject_code
            INNER JOIN (
                SELECT subject_code, MAX(attempt_number) as max_attempt
                FROM results
                WHERE student_usn = %s AND semester = %s
                GROUP BY subject_code
            ) latest ON r.subject_code = latest.subject_code 
                       AND r.attempt_number = latest.max_attempt
            WHERE r.student_usn = %s AND r.semester = %s
        """, (usn, semester, usn, semester))
        
        subject_results = cursor.fetchall()
        
        if not subject_results:
            continue
        
        # Calculate totals
        total_credits = 0
        total_grade_points_weighted = 0
        total_marks_obtained = 0
        total_marks_maximum = 0
        backlog_count = 0
        has_backlogs = False
        
        missing_credits = []
        
        for subject_code, total_marks, grade_points, letter_grade, credits in subject_results:
            # Skip subjects without credit info
            if credits is None or credits == 0:
                missing_credits.append(subject_code)
                continue
            
            # Determine max marks
            max_marks = get_subject_max_marks(subject_code, semester, cursor)
            
            # Add to totals
            total_credits += credits
            total_marks_obtained += (total_marks or 0)
            total_marks_maximum += max_marks
            
            if grade_points is not None:
                total_grade_points_weighted += (grade_points * credits)
            
            # Check for backlogs
            if letter_grade == 'F':
                backlog_count += 1
                has_backlogs = True
        
        # Skip if no valid credits
        if total_credits == 0:
            print(f"⚠️  Skipping {usn}: No credit info (missing: {missing_credits})")
            continue
        
        # Calculate SGPA
        sgpa = round(total_grade_points_weighted / total_credits, 2)
        
        # Calculate percentage
        percentage = round((total_marks_obtained / total_marks_maximum) * 100, 2) if total_marks_maximum > 0 else 0.0
        
        # Determine class grade
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
        """, (usn, semester, sgpa, total_marks_obtained, total_marks_maximum,
              percentage, total_credits, class_grade, has_backlogs, backlog_count))
        
        processed += 1
        if processed % 20 == 0:
            print(f"  Processed {processed} students...")
    
    conn.commit()
    print(f"✅ Calculated SGPA for {processed} students")


# =============================================================================
# STEP 3: UPDATE CGPA IN STUDENT_DETAILS TABLE
# =============================================================================

def update_cgpa(cursor, conn):
    """
    Calculate CGPA (mean of all SGPAs) and update student_details table
    """
    print(f"\n{'='*60}")
    print(f"STEP 3: Updating CGPA for All Students")
    print(f"{'='*60}")
    
    # Get all distinct students
    cursor.execute("SELECT DISTINCT student_usn FROM student_semester_summary")
    students = [row[0] for row in cursor.fetchall()]
    
    print(f"Found {len(students)} students to update")
    
    updated = 0
    for usn in students:
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
    
    conn.commit()
    print(f"✅ Updated CGPA for {updated} students")


# =============================================================================
# STEP 4: GENERATE SUMMARY REPORT
# =============================================================================

def generate_summary_report(semester, cursor):
    """
    Generate summary statistics for the semester
    """
    print(f"\n{'='*60}")
    print(f"SEMESTER {semester} - SUMMARY REPORT")
    print(f"{'='*60}")
    
    # Total students
    cursor.execute("""
        SELECT COUNT(DISTINCT student_usn)
        FROM student_semester_summary
        WHERE semester = %s
    """, (semester,))
    total_students = cursor.fetchone()[0]
    
    # Average SGPA
    cursor.execute("""
        SELECT AVG(sgpa), MAX(sgpa), MIN(sgpa)
        FROM student_semester_summary
        WHERE semester = %s
    """, (semester,))
    avg_sgpa, max_sgpa, min_sgpa = cursor.fetchone()
    
    # Class grade distribution
    cursor.execute("""
        SELECT class_grade, COUNT(*) as count
        FROM student_semester_summary
        WHERE semester = %s
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
    """, (semester,))
    class_distribution = cursor.fetchall()
    
    # Students with backlogs
    cursor.execute("""
        SELECT COUNT(*)
        FROM student_semester_summary
        WHERE semester = %s AND has_backlogs = TRUE
    """, (semester,))
    backlog_students = cursor.fetchone()[0]
    
    # Print report
    print(f"\n📊 Total Students: {total_students}")
    print(f"📈 Average SGPA: {avg_sgpa:.2f}")
    print(f"🏆 Highest SGPA: {max_sgpa:.2f}")
    print(f"📉 Lowest SGPA: {min_sgpa:.2f}")
    print(f"⚠️  Students with Backlogs: {backlog_students} ({(backlog_students/total_students*100):.1f}%)")
    
    print(f"\n🎓 Class Grade Distribution:")
    for class_grade, count in class_distribution:
        percentage = (count / total_students) * 100
        print(f"   {class_grade:<5} : {count:>3} students ({percentage:>5.1f}%)")
    
    print(f"{'='*60}\n")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def calculate_grades_for_semester(semester, verbose=True):
    """
    Main function to calculate all grades for a semester
    
    Args:
        semester: Semester number (1-8)
        verbose: Print detailed logs
    
    Returns:
        Dictionary with success status and stats
    """
    conn = get_db_connection()
    if not conn:
        return {"success": False, "error": "Database connection failed"}
    
    cursor = conn.cursor()
    
    try:
        if verbose:
            print(f"\n🔍 Starting grade calculation for Semester {semester}...")
        
        # Step 1: Update letter grades
        update_letter_grades(semester, cursor, conn)
        
        # Step 2: Calculate SGPA
        calculate_sgpa(semester, cursor, conn)
        
        # Step 3: Update CGPA
        update_cgpa(cursor, conn)
        
        # Step 4: Generate report
        if verbose:
            generate_summary_report(semester, cursor)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "semester": semester,
            "message": "Grade calculation completed successfully"
        }
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return {
            "success": False,
            "error": str(e)
        }


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Calculate SGPA/CGPA after scraping')
    parser.add_argument('--semester', type=int, required=True, help='Semester number (1-8)')
    parser.add_argument('--quiet', action='store_true', help='Suppress detailed output')
    
    args = parser.parse_args()
    
    result = calculate_grades_for_semester(args.semester, verbose=not args.quiet)
    
    if result['success']:
        print(f"\n✅ SUCCESS: Grade calculation completed for Semester {args.semester}")
        sys.exit(0)
    else:
        print(f"\n❌ ERROR: {result.get('error', 'Unknown error')}")
        sys.exit(1)
