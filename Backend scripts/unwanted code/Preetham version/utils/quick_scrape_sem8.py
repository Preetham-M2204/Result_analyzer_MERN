"""
Quick scraper for Semester 8 only - 21 Scheme IS students
Hardcoded to avoid interactive prompts
"""

import sys
sys.path.insert(0, r'd:\preetham\scrapper\Preetham version\utils')

from ultimate_scraper import scrape_semester_batch, get_db_connection, close_connection

def main():
    print("="*70)
    print("QUICK SCRAPER - SEMESTER 8 ONLY")
    print("="*70)
    
    # Get URL from user
    url = input("\nEnter Semester 8 URL: ").strip()
    if not url:
        print("No URL provided. Exiting.")
        return
    
    # Get students
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    cursor.execute("SELECT usn FROM student_details WHERE scheme='21' ORDER BY usn")
    students = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    print(f"\nFound {len(students)} students with scheme='21'")
    print("Starting scrape with 7 workers...\n")
    
    semester_config = {
        "semester": 8,
        "url": url
    }
    
    # Scrape
    failures = scrape_semester_batch(semester_config, students, max_workers=7)
    
    if failures:
        print(f"\n⚠️  {len(failures)} persistent failures:")
        for usn in failures[:10]:
            print(f"  - {usn}")
        if len(failures) > 10:
            print(f"  ... and {len(failures)-10} more")
    else:
        print("\n✅ All students scraped successfully!")
    
    print("\n" + "="*70)
    print("DONE!")
    print("="*70)

if __name__ == "__main__":
    main()
