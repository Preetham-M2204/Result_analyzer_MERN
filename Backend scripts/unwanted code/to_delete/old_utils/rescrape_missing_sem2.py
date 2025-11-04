"""
Re-scrape missing Semester 2 USNs
Auto-detects missing USNs from database and scrapes only those
"""

import os
from scrape_vtu_results_fast import get_vtu_results
from concurrent.futures import ThreadPoolExecutor, as_completed
from db_config import get_db_connection, close_connection
import time

def get_missing_usns_from_db(semester):
    """Get missing USNs directly from database (auto-detect)"""
    try:
        connection = get_db_connection()
        if not connection:
            return []
        
        cursor = connection.cursor()
        
        # Get all regular students (excluding lateral entry for sem 1 & 2)
        if semester in [1, 2]:
            cursor.execute("SELECT usn FROM student_details WHERE usn NOT LIKE '1BI24IS4%' ORDER BY usn")
        else:
            cursor.execute("SELECT usn FROM student_details ORDER BY usn")
        
        all_students = [row[0] for row in cursor.fetchall()]
        
        # Get students who have results for this semester
        cursor.execute("""
            SELECT DISTINCT student_usn 
            FROM results 
            WHERE semester = %s
        """, (semester,))
        students_with_results = set(row[0] for row in cursor.fetchall())
        
        cursor.close()
        close_connection(connection)
        
        # Find missing students
        missing_usns = [usn for usn in all_students if usn not in students_with_results]
        
        return missing_usns
        
    except Exception as e:
        print(f"❌ Error getting missing USNs: {e}")
        return []

def rescrape_missing_sem2(url, max_workers=8):
    """Re-scrape only the missing semester 2 USNs"""
    
    missing_usns = get_missing_usns_from_db(2)
    
    if not missing_usns:
        print("❌ No missing USNs to scrape.")
        return
    
    print("="*80)
    print(f"🔄 RE-SCRAPING MISSING SEMESTER 2 RESULTS")
    print("="*80)
    print(f"📋 Auto-detected {len(missing_usns)} missing USNs from database")
    
    if len(missing_usns) == 0:
        print("\n✅ No missing USNs! All students have semester 2 results.")
        return
    
    print(f"🚀 Using {max_workers} parallel workers")
    print("\n📝 Missing USNs:")
    for usn in missing_usns:
        print(f"   - {usn}")
    print("="*80)
    print()
    
    success_count = 0
    error_count = 0
    
    start_time = time.time()
    
    # Use ThreadPoolExecutor for parallel scraping
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_usn = {
            executor.submit(get_vtu_results, usn, url, 2): usn 
            for usn in missing_usns
        }
        
        # Process completed tasks
        for future in as_completed(future_to_usn):
            usn = future_to_usn[future]
            try:
                if future.result():
                    success_count += 1
                else:
                    error_count += 1
            except Exception:
                error_count += 1
    
    elapsed_time = time.time() - start_time
    
    print("\n" + "="*80)
    print(f"✅ Successfully scraped: {success_count} students")
    print(f"❌ Still missing/errors: {error_count}")
    print(f"⏱️  Total time: {elapsed_time:.2f} seconds")
    print("="*80)
    
    if error_count > 0:
        print("\n💡 Tip: Some USNs might be invalid or not have semester 2 results.")
        print("   You can manually check these USNs on VTU results website.")

if __name__ == "__main__":
    print("="*80)
    print("🚀 RE-SCRAPE MISSING SEMESTER 2 USNs")
    print("="*80)
    print()
    
    url = input("Enter VTU Semester 2 results URL: ").strip()
    workers = input("Number of parallel workers (default 8): ").strip()
    
    try:
        workers = int(workers) if workers else 8
        workers = min(workers, 10)
    except:
        workers = 8
    
    print()
    
    # Auto-detect missing count
    missing_count = len(get_missing_usns_from_db(2))
    
    if missing_count == 0:
        print("✅ No missing USNs found! All students have semester 2 results.")
        import sys
        sys.exit(0)
    
    confirm = input(f"Re-scrape {missing_count} missing USNs? (yes/no): ").strip().lower()
    
    if confirm in ['yes', 'y']:
        rescrape_missing_sem2(url, max_workers=workers)
    else:
        print("❌ Cancelled")
