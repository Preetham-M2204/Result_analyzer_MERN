# -*- coding: utf-8 -*-
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import mysql.connector
from db_config import DB_CONFIG

conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

print("\n" + "="*60)
print("DELETING INCORRECT RESULTS FOR 1BI22IS001")
print("="*60 + "\n")

# Delete the wrong semester 3 subjects that were scraped
cursor.execute("""
    DELETE FROM results 
    WHERE student_usn = '1BI22IS001'
""")

deleted_count = cursor.rowcount
conn.commit()

print(f"✅ Deleted {deleted_count} incorrect records for 1BI22IS001")
print("\n" + "="*60)

conn.close()
