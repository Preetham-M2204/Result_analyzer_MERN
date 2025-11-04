# -*- coding: utf-8 -*-
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import mysql.connector
from db_config import DB_CONFIG

conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

print("\n" + "="*80)
print("FIXING SEMESTER VALUES IN RESULTS TABLE")
print("="*80 + "\n")

# Step 1: Find all wrong semester entries
print("[INFO] Checking for records with wrong semesters...\n")

cursor.execute("""
    SELECT DISTINCT r.subject_code, r.semester as wrong_sem, s.semester as correct_sem
    FROM results r
    LEFT JOIN subjects s ON r.subject_code = s.subject_code
    WHERE s.semester IS NOT NULL 
      AND r.semester != s.semester
    ORDER BY r.subject_code
""")

wrong_subjects = cursor.fetchall()

if len(wrong_subjects) == 0:
    print("[OK] All semester values are correct! No updates needed.")
    conn.close()
    exit(0)

print(f"Found {len(wrong_subjects)} subjects with wrong semesters:\n")
print(f"{'Subject Code':<20} {'Wrong Sem':<12} {'Correct Sem'}")
print("-" * 80)
for subj in wrong_subjects:
    print(f"{subj[0]:<20} {subj[1]:<12} {subj[2]}")

print("\n" + "="*80)
print("UPDATING SEMESTER VALUES...")
print("="*80 + "\n")

# Step 2: Update each subject's semester
total_updated = 0

for subject_code, wrong_sem, correct_sem in wrong_subjects:
    cursor.execute("""
        UPDATE results r
        INNER JOIN subjects s ON r.subject_code = s.subject_code
        SET r.semester = s.semester
        WHERE r.subject_code = %s
          AND r.semester != s.semester
    """, (subject_code,))
    
    updated_count = cursor.rowcount
    total_updated += updated_count
    
    print(f"[OK] {subject_code}: Updated {updated_count} records (Sem {wrong_sem} -> {correct_sem})")

conn.commit()

print("\n" + "="*80)
print(f"[DONE] Total records updated: {total_updated}")
print("="*80 + "\n")

# Step 3: Verify the fix
print("[INFO] Verifying updates...\n")

cursor.execute("""
    SELECT DISTINCT r.subject_code, r.semester as wrong_sem, s.semester as correct_sem
    FROM results r
    LEFT JOIN subjects s ON r.subject_code = s.subject_code
    WHERE s.semester IS NOT NULL 
      AND r.semester != s.semester
""")

still_wrong = cursor.fetchall()

if len(still_wrong) == 0:
    print("[OK] Verification passed! All semesters are now correct!")
else:
    print(f"[WARN] Still found {len(still_wrong)} subjects with wrong semesters:")
    for subj in still_wrong:
        print(f"  - {subj[0]}: has {subj[1]}, should be {subj[2]}")

print("\n" + "="*80)

conn.close()
