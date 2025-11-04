"""
Fix BBOC407 Credits and Recalculate SGPA/CGPA
This script:
1. Updates BBOC407 credits from 4 to 2
2. Recalculates SGPA for all students who took this subject
3. Recalculates CGPA for all affected students
"""

import mysql.connector
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'resana'
}

# Letter grade to grade points mapping
GRADE_POINTS_MAP = {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6,
    'C': 5, 'P': 4, 'F': 0, 'AB': 0, 'WH': 0
}

def get_letter_grade(marks, total_marks):
    """Convert marks to letter grade"""
    if marks is None or total_marks is None or total_marks == 0:
        return 'F'
    
    percentage = (marks / total_marks) * 100
    
    if percentage >= 90: return 'O'
    elif percentage >= 80: return 'A+'
    elif percentage >= 70: return 'A'
    elif percentage >= 60: return 'B+'
    elif percentage >= 50: return 'B'
    elif percentage >= 40: return 'C'
    elif percentage >= 35: return 'P'
    else: return 'F'

def get_class_grade(sgpa):
    """Determine class grade based on SGPA"""
    if sgpa >= 7.75:
        return 'FCD'
    elif sgpa >= 6.25:
        return 'FC'
    elif sgpa >= 5.0:
        return 'SC'
    elif sgpa >= 4.0:
        return 'P'
    else:
        return 'F'

def update_subject_credits():
    """Update BBOC407 credits to 2"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("STEP 1: UPDATE SUBJECT CREDITS")
    print("="*60)
    
    # Check current credits
    cursor.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE subject_code = 'BBOC407'")
    result = cursor.fetchone()
    
    if result:
        print(f"Current: {result[0]} - {result[1]} - {result[2]} credits")
        
        # Update to 2 credits
        cursor.execute("UPDATE subjects SET credits = 2 WHERE subject_code = 'BBOC407'")
        conn.commit()
        print(f"Updated: {result[0]} - {result[1]} - 2 credits")
    else:
        print("Subject BBOC407 not found!")
        cursor.close()
        conn.close()
        return False
    
    cursor.close()
    conn.close()
    return True

def recalculate_semester_4_sgpa():
    """Recalculate SGPA for all students who took BBOC407 in semester 4"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("\n" + "="*60)
    print("STEP 2: RECALCULATE SEMESTER 4 SGPA")
    print("="*60)
    
    # Find all students who took BBOC407 in semester 4
    cursor.execute("""
        SELECT DISTINCT student_usn
        FROM results
        WHERE subject_code = 'BBOC407' AND semester = 4
    """)
    
    affected_students = cursor.fetchall()
    print(f"Found {len(affected_students)} students who took BBOC407 in semester 4")
    
    updated_count = 0
    
    for student in affected_students:
        usn = student['student_usn']
        
        # Get all results for semester 4
        cursor.execute("""
            SELECT r.subject_code, r.internal_marks, r.external_marks, 
                   r.total_marks, r.letter_grade, r.grade_points,
                   s.credits, s.subject_name
            FROM results r
            JOIN subjects s ON r.subject_code = s.subject_code
            WHERE r.student_usn = %s AND r.semester = 4
        """, (usn,))
        
        results = cursor.fetchall()
        
        total_credits = 0
        total_grade_points = 0
        total_marks_obtained = 0
        total_marks_maximum = 0
        has_backlogs = False
        backlog_count = 0
        
        for result in results:
            credits = result['credits']
            
            # Recalculate letter grade if needed
            letter_grade = result['letter_grade']
            if not letter_grade or letter_grade == '':
                letter_grade = get_letter_grade(result['total_marks'], 100)
            
            grade_points = GRADE_POINTS_MAP.get(letter_grade, 0)
            
            # Update grade points in results table if changed
            if result['grade_points'] != grade_points:
                cursor.execute("""
                    UPDATE results 
                    SET grade_points = %s, letter_grade = %s
                    WHERE student_usn = %s AND subject_code = %s AND semester = 4
                """, (grade_points, letter_grade, usn, result['subject_code']))
            
            total_credits += credits
            total_grade_points += (grade_points * credits)
            total_marks_obtained += (result['total_marks'] or 0)
            total_marks_maximum += 100
            
            if letter_grade == 'F':
                has_backlogs = True
                backlog_count += 1
        
        # Calculate SGPA
        sgpa = round(total_grade_points / total_credits, 2) if total_credits > 0 else 0.0
        percentage = round((total_marks_obtained / total_marks_maximum) * 100, 2) if total_marks_maximum > 0 else 0.0
        class_grade = get_class_grade(sgpa)
        
        # Update student_semester_summary
        cursor.execute("""
            UPDATE student_semester_summary
            SET sgpa = %s,
                total_marks_obtained = %s,
                total_marks_maximum = %s,
                percentage = %s,
                total_credits = %s,
                class_grade = %s,
                has_backlogs = %s,
                backlog_count = %s,
                calculated_at = NOW()
            WHERE student_usn = %s AND semester = 4
        """, (sgpa, total_marks_obtained, total_marks_maximum, percentage, 
              total_credits, class_grade, has_backlogs, backlog_count, usn))
        
        updated_count += 1
        if updated_count % 10 == 0:
            print(f"Updated {updated_count} students...")
    
    conn.commit()
    print(f"\nCompleted: Updated SGPA for {updated_count} students")
    
    cursor.close()
    conn.close()
    return updated_count

def recalculate_cgpa():
    """Recalculate CGPA for all affected students"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("\n" + "="*60)
    print("STEP 3: RECALCULATE CGPA")
    print("="*60)
    
    # Find all students who took BBOC407
    cursor.execute("""
        SELECT DISTINCT student_usn
        FROM results
        WHERE subject_code = 'BBOC407'
    """)
    
    affected_students = cursor.fetchall()
    print(f"Recalculating CGPA for {len(affected_students)} students")
    
    updated_count = 0
    
    for student in affected_students:
        usn = student['student_usn']
        
        # Get all semester SGPAs
        cursor.execute("""
            SELECT sgpa
            FROM student_semester_summary
            WHERE student_usn = %s AND sgpa IS NOT NULL
            ORDER BY semester
        """, (usn,))
        
        sgpas = [row['sgpa'] for row in cursor.fetchall()]
        
        if sgpas:
            cgpa = round(sum(sgpas) / len(sgpas), 2)
            
            # Update student_details
            cursor.execute("""
                UPDATE student_details
                SET cgpa = %s
                WHERE usn = %s
            """, (cgpa, usn))
            
            updated_count += 1
    
    conn.commit()
    print(f"Completed: Updated CGPA for {updated_count} students")
    
    cursor.close()
    conn.close()
    return updated_count

def generate_report():
    """Generate summary report"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("\n" + "="*60)
    print("FINAL REPORT")
    print("="*60)
    
    # Subject info
    cursor.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE subject_code = 'BBOC407'")
    subject = cursor.fetchone()
    print(f"\nSubject: {subject['subject_code']} - {subject['subject_name']}")
    print(f"Credits: {subject['credits']}")
    
    # Students affected
    cursor.execute("""
        SELECT COUNT(DISTINCT student_usn) as count
        FROM results
        WHERE subject_code = 'BBOC407'
    """)
    count = cursor.fetchone()['count']
    print(f"\nTotal students affected: {count}")
    
    # Semester 4 SGPA range
    cursor.execute("""
        SELECT MIN(sgpa) as min_sgpa, MAX(sgpa) as max_sgpa, AVG(sgpa) as avg_sgpa
        FROM student_semester_summary
        WHERE semester = 4 AND sgpa IS NOT NULL
    """)
    stats = cursor.fetchone()
    print(f"\nSemester 4 SGPA Statistics:")
    print(f"  Min: {stats['min_sgpa']:.2f}")
    print(f"  Max: {stats['max_sgpa']:.2f}")
    print(f"  Avg: {stats['avg_sgpa']:.2f}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("="*60)
    print("FIX BBOC407 CREDITS AND RECALCULATE SGPA/CGPA")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Update subject credits
        if not update_subject_credits():
            print("\nFailed to update subject credits")
            exit(1)
        
        # Step 2: Recalculate semester 4 SGPA
        recalculate_semester_4_sgpa()
        
        # Step 3: Recalculate CGPA
        recalculate_cgpa()
        
        # Step 4: Generate report
        generate_report()
        
        print("\n" + "="*60)
        print("ALL UPDATES COMPLETED SUCCESSFULLY")
        print("="*60)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
