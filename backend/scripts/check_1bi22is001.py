# -*- coding: utf-8 -*-
import mysql.connector
from db_config import DB_CONFIG

conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

cursor.execute("""
    SELECT subject_code, semester, internal_marks, external_marks, total_marks, result_status 
    FROM results 
    WHERE student_usn = '1BI22IS001' 
    ORDER BY semester, subject_code
""")

results = cursor.fetchall()

print('\nResults for 1BI22IS001:\n')
print(f"{'Subject':<15} {'Sem':<5} {'INT':<6} {'EXT':<6} {'Total':<8} {'Status'}")
print('-' * 60)
for r in results:
    print(f'{r[0]:<15} {r[1]:<5} {r[2]:<6} {r[3]:<6} {r[4]:<8} {r[5]}')

print(f'\nTotal records: {len(results)}\n')

conn.close()
