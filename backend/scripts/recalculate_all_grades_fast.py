"""
FAST BATCH GRADE RECALCULATION
================================
Ultra-fast version that processes all students in batches using bulk SQL operations.

Speed improvements:
- Single query to fetch all results
- Batch updates instead of individual queries
- Processes 200+ students in seconds instead of minutes
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from db_config import get_db_connection
from statistics import mean

def get_letter_grade(total_marks, max_marks=100):
    """Convert total marks to letter grade"""
    if total_marks is None or max_marks == 0:
        return 'F'
    
    percentage = (total_marks / max_marks) * 100
    
    if percentage >= 90: return 'O'
    elif percentage >= 80: return 'A+'
    elif percentage >= 70: return 'A'
    elif percentage >= 60: return 'B+'
    elif percentage >= 50: return 'B'
    elif percentage >= 40: return 'C'
    elif percentage >= 35: return 'P'
    else: return 'F'

def get_grade_points(letter_grade):
    """Convert letter grade to grade points"""
    grade_map = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}
    return grade_map.get(letter_grade, 0)

def get_class_grade(sgpa, has_backlogs):
    """Determine class grade"""
    if has_backlogs or sgpa < 4.0: return 'F'
    elif sgpa >= 7.75: return 'FCD'
    elif sgpa >= 6.25: return 'FC'
    elif sgpa >= 5.0: return 'SC'
    else: return 'P'

def fast_recalculate_all_grades():
    """Ultra-fast batch recalculation using bulk SQL operations"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        print(f"\n{'='*80}")
        print(f"🚀 FAST BATCH GRADE RECALCULATION")
        print(f"{'='*80}\n")
        
        # =====================================================================
        # STEP 1: Fix corrupted data (Rajarshi Datta & similar issues)
        # =====================================================================
        print("Step 1: Fixing corrupted revaluation data...")
        
        cursor.execute("""
            UPDATE results
            SET total_marks = internal_marks + external_marks
            WHERE total_marks = 0 
            AND internal_marks IS NOT NULL 
            AND external_marks IS NOT NULL
            AND internal_marks > 0 
            AND external_marks > 0
        """)
        fixed_corrupted = cursor.rowcount
        print(f"  ✓ Fixed {fixed_corrupted} corrupted total_marks entries")
        
        # Fix result_status that are numbers (should be PASS/FAIL)
        cursor.execute("""
            UPDATE results
            SET result_status = CASE
                WHEN external_marks = 0 THEN 
                    CASE WHEN total_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
                ELSE 
                    CASE WHEN external_marks >= 18 AND total_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
            END
            WHERE result_status NOT IN ('PASS', 'FAIL', 'REVALUATION', 'WITHHELD', 'ABSENT')
        """)
        fixed_status = cursor.rowcount
        print(f"  ✓ Fixed {fixed_status} incorrect result_status entries")
        
        conn.commit()
        
        # =====================================================================
        # STEP 2: Fetch ALL results (latest attempts only) in ONE query
        # =====================================================================
        print("\nStep 2: Fetching all student results...")
        
        cursor.execute("""
            SELECT 
                r.result_id,
                r.student_usn,
                r.semester,
                r.subject_code,
                r.internal_marks,
                r.external_marks,
                r.total_marks,
                r.attempt_number,
                COALESCE(s.credits, 
                    CASE 
                        WHEN r.subject_code LIKE '%L' THEN 3
                        WHEN s.subject_name LIKE '%LAB%' THEN 3
                        WHEN r.subject_code LIKE 'BNSK%' OR r.subject_code LIKE 'BUHK%' THEN 2
                        ELSE 4
                    END
                ) as credits,
                s.subject_name
            FROM results r
            LEFT JOIN subjects s ON r.subject_code = s.subject_code
            WHERE r.attempt_number = (
                SELECT MAX(r2.attempt_number)
                FROM results r2
                WHERE r2.student_usn = r.student_usn
                AND r2.subject_code = r.subject_code
                AND r2.semester = r.semester
            )
            ORDER BY r.student_usn, r.semester, r.subject_code
        """)
        
        all_results = cursor.fetchall()
        total_results = len(all_results)
        print(f"  ✓ Fetched {total_results} results (latest attempts)")
        
        # =====================================================================
        # STEP 3: Batch calculate grades for all results
        # =====================================================================
        print("\nStep 3: Calculating grades in batch...")
        
        grade_updates = []
        student_semesters = {}  # Group by (usn, semester) for SGPA calculation
        
        for result in all_results:
            result_id = result['result_id']
            usn = result['student_usn']
            semester = result['semester']
            total_marks = result['total_marks']
            internal = result['internal_marks'] or 0
            external = result['external_marks'] or 0
            credits = result['credits']
            
            # Determine max marks (200 for major projects, 100 for others)
            subject_name_upper = (result['subject_name'] or '').upper()
            if 'MAJOR PROJECT' in subject_name_upper or 'INTERNSHIP' in subject_name_upper:
                max_marks = 200
            else:
                max_marks = 100
            
            # Determine pass/fail status
            if external == 0:  # Internal-only
                result_status = 'PASS' if total_marks >= 40 else 'FAIL'
            else:
                result_status = 'PASS' if (external >= 18 and total_marks >= 40) else 'FAIL'
            
            # Calculate grade
            letter_grade = get_letter_grade(total_marks, max_marks)
            grade_points = get_grade_points(letter_grade)
            
            # Override to F if failed
            if result_status == 'FAIL':
                letter_grade = 'F'
                grade_points = 0
            
            # Add to batch update
            grade_updates.append((letter_grade, grade_points, result_status, result_id))
            
            # Group for SGPA calculation
            key = (usn, semester)
            if key not in student_semesters:
                student_semesters[key] = []
            student_semesters[key].append({
                'total_marks': total_marks,
                'max_marks': max_marks,
                'grade_points': grade_points,
                'credits': credits,
                'result_status': result_status,
                'letter_grade': letter_grade
            })
        
        # Batch update all grades
        print(f"  ✓ Calculated grades for {len(grade_updates)} results")
        print(f"  ⚡ Executing batch update...")
        
        cursor.executemany("""
            UPDATE results
            SET letter_grade = %s, grade_points = %s, result_status = %s
            WHERE result_id = %s
        """, grade_updates)
        
        updated_grades = cursor.rowcount
        print(f"  ✓ Updated {updated_grades} result grades")
        conn.commit()
        
        # =====================================================================
        # STEP 4: Calculate SGPA for all student-semester combinations
        # =====================================================================
        print(f"\nStep 4: Calculating SGPA for {len(student_semesters)} student-semester combinations...")
        
        sgpa_updates = []
        
        for (usn, semester), subjects in student_semesters.items():
            total_credits = sum(s['credits'] for s in subjects)
            total_grade_points = sum(s['grade_points'] * s['credits'] for s in subjects)
            total_marks_obtained = sum(s['total_marks'] for s in subjects)
            total_marks_maximum = sum(s['max_marks'] for s in subjects)
            backlog_count = sum(1 for s in subjects if s['result_status'] == 'FAIL')
            has_backlogs = backlog_count > 0
            
            sgpa = round(total_grade_points / total_credits, 2) if total_credits > 0 else 0.0
            percentage = round((total_marks_obtained / total_marks_maximum) * 100, 2) if total_marks_maximum > 0 else 0.0
            class_grade = get_class_grade(sgpa, has_backlogs)
            
            sgpa_updates.append((
                usn, semester, sgpa, total_marks_obtained, total_marks_maximum,
                percentage, total_credits, class_grade, has_backlogs, backlog_count,
                # For UPDATE clause
                sgpa, total_marks_obtained, total_marks_maximum,
                percentage, total_credits, class_grade, has_backlogs, backlog_count
            ))
        
        print(f"  ⚡ Executing batch SGPA update...")
        cursor.executemany("""
            INSERT INTO student_semester_summary 
            (student_usn, semester, sgpa, total_marks_obtained, total_marks_maximum,
             percentage, total_credits, class_grade, has_backlogs, backlog_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                sgpa = %s,
                total_marks_obtained = %s,
                total_marks_maximum = %s,
                percentage = %s,
                total_credits = %s,
                class_grade = %s,
                has_backlogs = %s,
                backlog_count = %s,
                calculated_at = CURRENT_TIMESTAMP
        """, sgpa_updates)
        
        updated_sgpa = cursor.rowcount
        print(f"  ✓ Updated SGPA for {updated_sgpa} student-semesters")
        conn.commit()
        
        # =====================================================================
        # STEP 5: Calculate CGPA for all students
        # =====================================================================
        print("\nStep 5: Calculating CGPA for all students...")
        
        cursor.execute("""
            SELECT student_usn, AVG(sgpa) as cgpa
            FROM student_semester_summary
            GROUP BY student_usn
        """)
        
        cgpa_data = cursor.fetchall()
        cgpa_updates = [(round(row['cgpa'], 2), row['student_usn']) for row in cgpa_data]
        
        print(f"  ⚡ Executing batch CGPA update...")
        cursor.executemany("""
            UPDATE student_details
            SET cgpa = %s
            WHERE usn = %s
        """, cgpa_updates)
        
        updated_cgpa = cursor.rowcount
        print(f"  ✓ Updated CGPA for {updated_cgpa} students")
        conn.commit()
        
        # =====================================================================
        # FINAL SUMMARY
        # =====================================================================
        print(f"\n{'='*80}")
        print(f"✅ BATCH RECALCULATION COMPLETED SUCCESSFULLY")
        print(f"{'='*80}")
        print(f"  • Fixed corrupted data: {fixed_corrupted + fixed_status} records")
        print(f"  • Updated grades: {updated_grades} results")
        print(f"  • Updated SGPA: {updated_sgpa} student-semesters")
        print(f"  • Updated CGPA: {updated_cgpa} students")
        print(f"{'='*80}\n")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    success = fast_recalculate_all_grades()
    sys.exit(0 if success else 1)
