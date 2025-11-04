# -*- coding: utf-8 -*-
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import mysql.connector
from db_config import DB_CONFIG

conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

print("\n" + "="*60)
print("CHECKING SCRAPED RESULTS FOR 1BI22IS001")
print("="*60 + "\n")

cursor.execute("""
    SELECT student_usn, subject_code, internal_marks, external_marks, total_marks, result_status, semester, attempt_number 
    FROM results 
    WHERE student_usn = '1BI22IS001' 
    ORDER BY semester, subject_code
""")

results = cursor.fetchall()
print(f"✅ Found {len(results)} results for 1BI22IS001:\n")

if results:
    print(f"{'Subject Code':<15} {'Sem':<5} {'INT':<6} {'EXT':<6} {'Total':<8} {'Status':<10} {'Attempt'}")
    print("-" * 70)
    for r in results:
        print(f"{r[1]:<15} {r[6]:<5} {r[2]:<6} {r[3]:<6} {r[4]:<8} {r[5]:<10} {r[7]}")
else:
    print("❌ No results found in database!")

print("\n" + "="*60)

conn.close()
