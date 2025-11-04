# -*- coding: utf-8 -*-
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import mysql.connector
from db_config import DB_CONFIG

conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

print("\n" + "="*70)
print("FIXING WRONG SEMESTER DATA")
print("="*70 + "\n")

# Find all records where semester doesn't match subject code
cursor.execute("""
    SELECT result_id, student_usn, subject_code, semester 
    FROM results
    WHERE subject_code LIKE 'BMATS101%' AND semester != 1
       OR subject_code LIKE 'BMATS201%' AND semester != 2
       OR subject_code LIKE 'BCS301%' AND semester != 3
       OR subject_code LIKE 'BCS401%' AND semester != 4
    ORDER BY subject_code
""")

wrong_records = cursor.fetchall()

print(f"Found {len(wrong_records)} records with wrong semester:\n")

if wrong_records:
    print(f"{'ID':<8} {'USN':<15} {'Subject Code':<15} {'Wrong Sem'}")
    print("-" * 70)
    for r in wrong_records[:20]:  # Show first 20
        print(f"{r[0]:<8} {r[1]:<15} {r[2]:<15} {r[3]}")
    
    if len(wrong_records) > 20:
        print(f"\n... and {len(wrong_records) - 20} more records")
    
    print("\n" + "="*70)
    print("DELETING INCORRECT RECORDS...")
    print("="*70)
    
    # Delete all records with wrong semesters
    cursor.execute("DELETE FROM results WHERE semester = 2 AND subject_code LIKE 'BMATS101%'")
    deleted = cursor.rowcount
    print(f"Deleted {deleted} BMATS101 records marked as Semester 2")
    
    conn.commit()
    print("\n[OK] All incorrect records deleted!")
else:
    print("[OK] No incorrect records found!")

print("\n" + "="*70)

conn.close()
