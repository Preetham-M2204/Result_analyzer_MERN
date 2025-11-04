"""
Re-scrape missing Semester 4 results
Scrapes only the USNs that don't have Sem 4 data
"""

import time
from scrape_vtu_results import get_vtu_results
from db_config import get_db_connection, close_connection

def rescrape_missing_sem4():
    """
    Re-scrape results for USNs missing Semester 4 data
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
        
        cursor.close()
        close_connection(connection)
        
        if not missing_students:
            print("✅ All students already have Semester 4 results!")
            return
        
        # Get VTU URL
        print("="*80)
        print(f"🔍 Found {len(missing_students)} USNs missing Semester 4 results")
        print("="*80)
        
        url = input("\nEnter VTU Semester 4 results URL: ").strip()
        
        print("\n⚠️  WARNING: This will scrape results for these USNs:")
        for idx, (usn, name) in enumerate(missing_students[:5], 1):
            print(f"  {idx}. {usn} - {name}")
        if len(missing_students) > 5:
            print(f"  ... and {len(missing_students) - 5} more")
        
        confirm = input("\nContinue? (yes/no): ").strip().lower()
        
        if confirm not in ['yes', 'y']:
            print("❌ Cancelled")
            return
        
        # Start scraping
        print("\n" + "="*80)
        print("🚀 STARTING SCRAPING PROCESS")
        print("="*80)
        
        success_count = 0
        error_count = 0
        semester = 4
        
        for idx, (usn, name) in enumerate(missing_students, 1):
            print(f"\n[{idx}/{len(missing_students)}] 🔍 Scraping: {usn} - {name}")
            
            if get_vtu_results(usn, url, semester):
                success_count += 1
            else:
                error_count += 1
            
            # Rate limiting - wait between requests
            if idx < len(missing_students):  # Don't wait after last one
                time.sleep(3)
        
        # Final summary
        print("\n" + "="*80)
        print("📊 SCRAPING COMPLETED")
        print("="*80)
        print(f"✅ Successfully scraped: {success_count} students")
        print(f"❌ Errors/Not Found: {error_count} students")
        print("="*80)
        
        # Save failed USNs if any
        if error_count > 0:
            print("\n💡 Tip: You can run this script again to retry failed USNs")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
        print(f"✅ Successfully scraped: {success_count} students")
        print(f"❌ Errors/Not Found: {error_count} students")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("="*80)
    print("🚀 RE-SCRAPE MISSING SEMESTER 4 RESULTS")
    print("="*80)
    print()
    rescrape_missing_sem4()
