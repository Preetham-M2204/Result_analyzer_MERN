"""
Scrape Semester 8 results for 1BI21IS% and 1BI22IS4% patterns
URL: https://results.vtu.ac.in/JJEcbcs25/index.php
"""
import sys
sys.path.insert(0, r'd:\preetham\scrapper\Preetham version\utils')

from ultimate_scraper import scrape_semester_batch, get_db_connection, close_connection

def main():
    url = "https://results.vtu.ac.in/JJEcbcs25/index.php"
    
    print("="*70)
    print("SCRAPING SEMESTER 8 RESULTS")
    print("="*70)
    print(f"URL: {url}")
    print()
    
    # Get students matching both patterns
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    
    # Get 1BI21IS% students
    cursor.execute("SELECT usn FROM student_details WHERE usn LIKE '1BI21IS%' ORDER BY usn")
    students_21 = [row[0] for row in cursor.fetchall()]
    
    # Get 1BI22IS4% students (diploma)
    cursor.execute("SELECT usn FROM student_details WHERE usn LIKE '1BI22IS4%' ORDER BY usn")
    students_22 = [row[0] for row in cursor.fetchall()]
    
    cursor.close()
    close_connection(connection)
    
    all_students = students_21 + students_22
    
    print(f"✅ Found {len(students_21)} students matching 1BI21IS%")
    print(f"✅ Found {len(students_22)} students matching 1BI22IS4%")
    print(f"✅ Total: {len(all_students)} students to scrape")
    print()
    print("Starting scrape with 7 workers...")
    print("="*70)
    print()
    
    semester_config = {
        "semester": 8,
        "url": url
    }
    
    # Scrape
    failures = scrape_semester_batch(semester_config, all_students, max_workers=7)
    
    print()
    print("="*70)
    print("SCRAPING COMPLETE")
    print("="*70)
    
    if failures:
        print(f"⚠️  {len(failures)} persistent failures:")
        for usn in failures[:20]:
            print(f"  - {usn}")
        if len(failures) > 20:
            print(f"  ... and {len(failures)-20} more")
    else:
        print("✅ All students scraped successfully!")
    
    print("="*70)

if __name__ == "__main__":
    main()
