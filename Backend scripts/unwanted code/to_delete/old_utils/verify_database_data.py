"""
Verify all scraped data is written to MySQL database
"""
import mysql.connector
from db_config import get_db_connection, close_connection

def verify_data():
    print("🔍 Verifying database data completeness...\n")
    
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return
    
    cursor = conn.cursor()
    
    try:
        # 1. Check total students
        cursor.execute("SELECT COUNT(*) FROM student_details")
        total_students = cursor.fetchone()[0]
        print(f"📊 Total Students in Database: {total_students}")
        
        # 2. Check regular students (1BI23IS)
        cursor.execute("SELECT COUNT(*) FROM student_details WHERE usn LIKE '1BI23IS%'")
        regular_students = cursor.fetchone()[0]
        print(f"   Regular Students (1BI23IS): {regular_students}")
        
        # 3. Check lateral entry students (1BI24IS4)
        cursor.execute("SELECT COUNT(*) FROM student_details WHERE usn LIKE '1BI24IS4%'")
        lateral_students = cursor.fetchone()[0]
        print(f"   Lateral Entry Students (1BI24IS4): {lateral_students}\n")
        
        # 4. Check results per semester
        print("📚 Results per Semester:")
        for sem in [1, 2, 3, 4]:
            cursor.execute(f"""
                SELECT COUNT(DISTINCT student_usn) 
                FROM results 
                WHERE semester = {sem}
            """)
            students_with_results = cursor.fetchone()[0]
            
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM results 
                WHERE semester = {sem}
            """)
            total_records = cursor.fetchone()[0]
            
            print(f"   Semester {sem}: {students_with_results} students, {total_records} result records")
        
        # 5. Check semester-wise summary
        print("\n📈 Student Semester Summary:")
        cursor.execute("""
            SELECT semester, COUNT(*) 
            FROM student_semester_summary 
            GROUP BY semester 
            ORDER BY semester
        """)
        for row in cursor.fetchall():
            print(f"   Semester {row[0]}: {row[1]} SGPA records")
        
        # 6. Check CGPA status
        cursor.execute("SELECT COUNT(*) FROM student_details WHERE cgpa IS NOT NULL")
        students_with_cgpa = cursor.fetchone()[0]
        print(f"\n🎓 Students with CGPA: {students_with_cgpa}/{total_students}")
        
        # 7. Check subjects
        cursor.execute("SELECT COUNT(*) FROM subjects")
        total_subjects = cursor.fetchone()[0]
        print(f"\n📖 Total Subjects in Database: {total_subjects}")
        
        cursor.execute("""
            SELECT semester, COUNT(*) 
            FROM subjects 
            GROUP BY semester 
            ORDER BY semester
        """)
        print("   Subjects per Semester:")
        for row in cursor.fetchall():
            print(f"      Semester {row[0]}: {row[1]} subjects")
        
        # 8. Check for missing data per semester
        print("\n⚠️  Missing Data Analysis:")
        
        # Semester 1 & 2 (only regular students should have data)
        for sem in [1, 2]:
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM student_details 
                WHERE usn LIKE '1BI23IS%' 
                AND usn NOT IN (
                    SELECT DISTINCT student_usn 
                    FROM results 
                    WHERE semester = {sem}
                )
            """)
            missing = cursor.fetchone()[0]
            print(f"   Semester {sem}: {missing} regular students missing results")
        
        # Semester 3 & 4 (all students should have data)
        for sem in [3, 4]:
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM student_details 
                WHERE usn NOT IN (
                    SELECT DISTINCT student_usn 
                    FROM results 
                    WHERE semester = {sem}
                )
            """)
            missing = cursor.fetchone()[0]
            print(f"   Semester {sem}: {missing} students missing results")
        
        # 9. Sample data check
        print("\n📋 Sample Data from Each Semester:")
        for sem in [1, 2, 3, 4]:
            cursor.execute(f"""
                SELECT r.student_usn, s.name, COUNT(r.subject_code) as subject_count
                FROM results r
                JOIN student_details s ON r.student_usn = s.usn
                WHERE r.semester = {sem}
                GROUP BY r.student_usn, s.name
                ORDER BY r.student_usn
                LIMIT 3
            """)
            results = cursor.fetchall()
            if results:
                print(f"\n   Semester {sem} (first 3 students):")
                for row in results:
                    print(f"      {row[0]} - {row[1]}: {row[2]} subjects")
        
        print("\n✅ Database verification complete!")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
    finally:
        cursor.close()
        close_connection(conn)

if __name__ == "__main__":
    verify_data()
