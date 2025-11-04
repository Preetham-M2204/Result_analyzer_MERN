"""Check what was scraped recently and identify Sem 8 codes wrongly stored as Sem 2"""
from db_config import get_db_connection, close_connection
import re

conn = get_db_connection()
cur = conn.cursor()

# Get recent scrapes (last 24 hours)
cur.execute("""
    SELECT DISTINCT subject_code, semester, COUNT(*) as count
    FROM results 
    WHERE scraped_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY subject_code, semester
    ORDER BY semester, subject_code
""")
recent = cur.fetchall()

print("Subject codes scraped in last 24 hours:")
sem2_codes_to_fix = []
for sc, sem, count in recent:
    print(f"  {sc} | Sem {sem} | {count} records")
    
    # Check if this looks like a Sem 8 code
    if sem == 2 and re.search(r'8', sc):
        sem2_codes_to_fix.append(sc)

if sem2_codes_to_fix:
    print(f"\n⚠️ Codes stored as Sem 2 but might be Sem 8 (have '8' in code):")
    for sc in sem2_codes_to_fix:
        print(f"  {sc}")
    
    # Get count
    placeholders = ','.join(['%s'] * len(sem2_codes_to_fix))
    cur.execute(f"""
        SELECT COUNT(*) FROM results 
        WHERE semester = 2 AND subject_code IN ({placeholders})
        AND scraped_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    """, sem2_codes_to_fix)
    count = cur.fetchone()[0]
    
    print(f"\nTotal records to fix: {count}")
    
    if count > 0:
        confirm = input(f"Update these {count} records from Sem 2 to Sem 8? (yes/no): ")
        
        if confirm.lower() == 'yes':
            cur.execute(f"""
                UPDATE results 
                SET semester = 8
                WHERE semester = 2 AND subject_code IN ({placeholders})
                AND scraped_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            """, sem2_codes_to_fix)
            conn.commit()
            print(f"✅ Updated {cur.rowcount} records")

cur.close()
close_connection(conn)
