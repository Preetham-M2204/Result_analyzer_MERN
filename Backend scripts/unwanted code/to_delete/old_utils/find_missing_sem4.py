"""
Quick script to find USNs missing 4th semester results
"""

from db_config import get_db_connection, close_connection

def find_missing_sem4_usns():
    """
    Find all USNs that don't have any 4th semester results
    """
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        
        # Get all students
        cursor.execute("SELECT usn, name FROM student_details ORDER BY usn")
        all_students = cursor.fetchall()
        
        # Get students who have sem 4 results
        cursor.execute("""
            SELECT DISTINCT student_usn 
            FROM results 
            WHERE semester = 4
        """)
        students_with_sem4 = set(row[0] for row in cursor.fetchall())
        
        # Find missing students
        missing_students = []
        for usn, name in all_students:
            if usn not in students_with_sem4:
                missing_students.append((usn, name))
        
        # Display results
        print("="*80)
        print(f"📊 SUMMARY:")
        print(f"   Total students: {len(all_students)}")
        print(f"   Students with Sem 4 results: {len(students_with_sem4)}")
        print(f"   Students WITHOUT Sem 4 results: {len(missing_students)}")
        print("="*80)
        
        if missing_students:
            print(f"\n❌ USNs MISSING Semester 4 Results ({len(missing_students)} students):")
            print("-"*80)
            for idx, (usn, name) in enumerate(missing_students, 1):
                print(f"{idx:3}. {usn:15} - {name}")
            
            # Save to file
            with open('missing_sem4_usns.txt', 'w') as f:
                f.write("USNs Missing Semester 4 Results\n")
                f.write("="*80 + "\n\n")
                for usn, name in missing_students:
                    f.write(f"{usn} - {name}\n")
            
            print(f"\n💾 List saved to: missing_sem4_usns.txt")
        else:
            print("\n✅ All students have Semester 4 results!")
        
        cursor.close()
        close_connection(connection)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 Finding USNs missing Semester 4 results...\n")
    find_missing_sem4_usns()
