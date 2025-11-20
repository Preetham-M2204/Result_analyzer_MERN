"""
Fix ALL result records:
1. Fix corrupted revaluation records (total_marks = 0, invalid status)
2. Normalize result_status: P -> PASS, F -> FAIL
"""
from db_config import get_db_connection

def fix_all_results():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("=" * 80)
    print("FIXING ALL RESULT RECORDS")
    print("=" * 80)
    
    # Fix 1: Corrupted records with total_marks = 0
    print("\n📝 Step 1: Fixing corrupted records with total_marks = 0...")
    cursor.execute("""
        UPDATE results 
        SET total_marks = internal_marks + external_marks
        WHERE total_marks = 0 AND (internal_marks > 0 OR external_marks > 0)
    """)
    fixed_totals = cursor.rowcount
    print(f"✅ Fixed {fixed_totals} records with incorrect total_marks")
    
    # Fix 2: Invalid result_status (not PASS or FAIL)
    print("\n📝 Step 2: Fixing invalid result_status values...")
    
    # First, check what unique statuses exist
    cursor.execute("SELECT DISTINCT result_status FROM results ORDER BY result_status")
    statuses = [row[0] for row in cursor.fetchall()]
    print(f"   Current statuses in database: {statuses}")
    
    # Normalize P -> PASS
    cursor.execute("UPDATE results SET result_status = 'PASS' WHERE result_status = 'P'")
    pass_fixed = cursor.rowcount
    print(f"✅ Changed {pass_fixed} records from 'P' to 'PASS'")
    
    # Normalize F -> FAIL
    cursor.execute("UPDATE results SET result_status = 'FAIL' WHERE result_status = 'F'")
    fail_fixed = cursor.rowcount
    print(f"✅ Changed {fail_fixed} records from 'F' to 'FAIL'")
    
    # Fix any numeric or invalid statuses based on PROPER passing criteria
    # PASS criteria: 
    # 1. If subject has external component (max external > 0): External >= 18 AND Total >= 40
    # 2. If subject is internal-only (max external = 0): Internal >= 40
    cursor.execute("""
        UPDATE results r
        INNER JOIN (
            SELECT subject_code, MAX(external_marks) as max_external
            FROM results
            GROUP BY subject_code
        ) s ON r.subject_code = s.subject_code
        SET r.result_status = CASE 
            WHEN s.max_external = 0 THEN 
                CASE WHEN r.internal_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
            ELSE 
                CASE WHEN r.external_marks >= 18 AND r.total_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
        END
        WHERE r.result_status NOT IN ('PASS', 'FAIL')
    """)
    invalid_fixed = cursor.rowcount
    print(f"✅ Fixed {invalid_fixed} records with invalid status (numeric/other)")
    
    # Fix 2.5: Recalculate ALL result_status with proper criteria
    print("\n📝 Step 2.5: Recalculating ALL result_status with proper passing criteria...")
    print("   Criteria:")
    print("   - Internal-only subjects (external=0): Internal >= 40")
    print("   - Subjects with external: External >= 18 AND Total >= 40")
    cursor.execute("""
        UPDATE results r
        INNER JOIN (
            SELECT subject_code, MAX(external_marks) as max_external
            FROM results
            GROUP BY subject_code
        ) s ON r.subject_code = s.subject_code
        SET r.result_status = CASE 
            WHEN s.max_external = 0 THEN 
                CASE WHEN r.internal_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
            ELSE 
                CASE WHEN r.external_marks >= 18 AND r.total_marks >= 40 THEN 'PASS' ELSE 'FAIL' END
        END
    """)
    recalc_status = cursor.rowcount
    print(f"✅ Recalculated {recalc_status} result statuses")
    
    # Fix 3: Recalculate grades based on total_marks
    print("\n📝 Step 3: Recalculating letter grades...")
    cursor.execute("""
        UPDATE results 
        SET letter_grade = CASE
            WHEN total_marks >= 90 THEN 'O'
            WHEN total_marks >= 80 THEN 'A+'
            WHEN total_marks >= 70 THEN 'A'
            WHEN total_marks >= 60 THEN 'B+'
            WHEN total_marks >= 50 THEN 'B'
            WHEN total_marks >= 40 THEN 'C'
            ELSE 'F'
        END
    """)
    grades_updated = cursor.rowcount
    print(f"✅ Updated {grades_updated} letter grades")
    
    # Fix 4: Recalculate grade_points
    print("\n📝 Step 4: Recalculating grade points...")
    cursor.execute("""
        UPDATE results 
        SET grade_points = CASE
            WHEN letter_grade = 'O' THEN 10
            WHEN letter_grade = 'A+' THEN 9
            WHEN letter_grade = 'A' THEN 8
            WHEN letter_grade = 'B+' THEN 7
            WHEN letter_grade = 'B' THEN 6
            WHEN letter_grade = 'C' THEN 5
            ELSE 0
        END
    """)
    points_updated = cursor.rowcount
    print(f"✅ Updated {points_updated} grade points")
    
    # Commit all changes
    conn.commit()
    
    print("\n" + "=" * 80)
    print("✅ ALL FIXES APPLIED SUCCESSFULLY!")
    print("=" * 80)
    
    # Verify Rajarshi's BCS403 specifically
    print("\n🔍 Verifying Rajarshi Datta's BCS403 records...")
    cursor.execute("""
        SELECT student_usn, subject_code, semester, attempt_number,
               internal_marks, external_marks, total_marks, 
               letter_grade, result_status
        FROM results
        WHERE student_usn = '1BI23IS089' AND subject_code = 'BCS403'
        ORDER BY attempt_number
    """)
    
    records = cursor.fetchall()
    for rec in records:
        print(f"\n  Attempt {rec[3]}:")
        print(f"    Internal: {rec[4]}, External: {rec[5]}, Total: {rec[6]}")
        print(f"    Grade: {rec[7]}, Status: {rec[8]}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    fix_all_results()
