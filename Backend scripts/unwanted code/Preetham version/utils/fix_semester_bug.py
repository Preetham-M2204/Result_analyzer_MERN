"""
Fix semester detection bug - update wrongly stored Sem 2 records to Sem 8
Subject codes like 21IS81, 21INT82 should be Sem 8, not Sem 2
"""
from db_config import get_db_connection, close_connection

conn = get_db_connection()
cur = conn.cursor()

# Find records scraped today with subject codes ending in 8 but stored as sem 2
query = """
SELECT result_id, student_usn, subject_code, semester, scraped_at
FROM results
WHERE semester = 2 
  AND DATE(scraped_at) = CURDATE()
  AND subject_code REGEXP '21[A-Z]{2,4}8[0-9]?$'
ORDER BY scraped_at DESC
LIMIT 100
"""

cur.execute(query)
wrong_records = cur.fetchall()

print(f"Found {len(wrong_records)} records with wrong semester (should be 8, stored as 2)")
print("\nSample wrong records:")
for rid, usn, sc, sem, scraped in wrong_records[:10]:
    print(f"  ID {rid}: {usn} | {sc} | Sem {sem} | {scraped}")

if wrong_records:
    confirm = input(f"\nUpdate all {len(wrong_records)} records from Sem 2 to Sem 8? (yes/no): ")
    
    if confirm.lower() == 'yes':
        # Update semester from 2 to 8 for these records
        update_query = """
        UPDATE results 
        SET semester = 8 
        WHERE semester = 2 
          AND DATE(scraped_at) = CURDATE()
          AND subject_code REGEXP '21[A-Z]{2,4}8[0-9]?$'
        """
        
        cur.execute(update_query)
        conn.commit()
        
        print(f"\n✅ Updated {cur.rowcount} records from Sem 2 to Sem 8")
        
        # Verify
        cur.execute("SELECT COUNT(*) FROM results WHERE semester=8")
        count = cur.fetchone()[0]
        print(f"✅ Total Sem 8 records now: {count}")
    else:
        print("\nNo changes made")

cur.close()
close_connection(conn)
