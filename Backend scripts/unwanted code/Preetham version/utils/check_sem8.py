"""Check if Semester 8 results were scraped"""
from db_config import get_db_connection, close_connection

conn = get_db_connection()
cur = conn.cursor()

# Count results per semester for scheme=21
cur.execute("""
    SELECT semester, COUNT(*) 
    FROM results 
    WHERE student_usn IN (SELECT usn FROM student_details WHERE scheme='21')
    GROUP BY semester 
    ORDER BY semester
""")
rows = cur.fetchall()
print('Results per semester for scheme=21 students:')
for sem, count in rows:
    print(f'  Sem {sem}: {count} records')

# Sample Sem 8 results
cur.execute("SELECT student_usn, subject_code, semester, total_marks FROM results WHERE semester=8 LIMIT 10")
r8 = cur.fetchall()
print('\nSample Semester 8 results:')
if r8:
    for usn, sc, s, t in r8:
        print(f'  {usn} | {sc} | Sem {s} | Total: {t}')
else:
    print('  NO SEMESTER 8 RESULTS FOUND!')

cur.close()
close_connection(conn)
