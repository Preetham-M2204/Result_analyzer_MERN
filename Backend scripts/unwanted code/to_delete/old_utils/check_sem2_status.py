"""
Check Semester 2 scraping status and find missing USNs
"""

from db_config import get_db_connection, close_connection

def check_sem2_status():
    """Check which students have/don't have semester 2 results"""
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        
        # Get all regular students (excluding lateral entry)
        cursor.execute("SELECT usn, name FROM student_details WHERE usn NOT LIKE '1BI24IS4%' ORDER BY usn")
        all_students = cursor.fetchall()
        
        # Get students who have sem 2 results
        cursor.execute("""
            SELECT DISTINCT student_usn 
            FROM results 
            WHERE semester = 2
        """)
        students_with_sem2 = set(row[0] for row in cursor.fetchall())
        
        # Find missing students
        missing_students = []
        for usn, name in all_students:
            if usn not in students_with_sem2:
                missing_students.append((usn, name))
        
        # Display results
        print("="*80)
        print(f"📊 SEMESTER 2 SCRAPING STATUS:")
        print(f"   Total regular students (1BI23IS): {len(all_students)}")
        print(f"   Students WITH Sem 2 results: {len(students_with_sem2)}")
        print(f"   Students WITHOUT Sem 2 results: {len(missing_students)}")
        print("="*80)
        
        if missing_students:
            print(f"\n❌ USNs MISSING Semester 2 Results ({len(missing_students)} students):")
            print("-"*80)
            for idx, (usn, name) in enumerate(missing_students, 1):
                print(f"{idx:3}. {usn:15} - {name}")
            
            # Save to file
            with open('missing_sem2_usns.txt', 'w') as f:
                f.write("USNs Missing Semester 2 Results\n")
                f.write("="*80 + "\n\n")
                for usn, name in missing_students:
                    f.write(f"{usn} - {name}\n")
            
            print(f"\n💾 List saved to: missing_sem2_usns.txt")
        else:
            print("\n✅ All regular students have Semester 2 results!")
        
        # Show sample of scraped data
        if students_with_sem2:
            print(f"\n📋 Sample of scraped Semester 2 results:")
            print("-"*80)
            cursor.execute("""
                SELECT student_usn, COUNT(*) as subject_count
                FROM results 
                WHERE semester = 2
                GROUP BY student_usn
                LIMIT 5
            """)
            samples = cursor.fetchall()
            for usn, count in samples:
                print(f"{usn}: {count} subjects")
            print("-"*80)
        
        cursor.close()
        close_connection(connection)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 Checking Semester 2 scraping status...\n")
    check_sem2_status()
