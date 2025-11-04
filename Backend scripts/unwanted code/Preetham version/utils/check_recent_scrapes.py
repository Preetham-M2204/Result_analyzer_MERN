"""Check what semesters are in database and sample data"""
from db_config import get_db_connection, close_connection

conn = get_db_connection()
cur = conn.cursor()

cur.execute('SELECT DISTINCT semester FROM results ORDER BY semester')
sems = cur.fetchall()
print('Semesters currently in database:')
for s in sems:
    cur.execute(f'SELECT COUNT(*) FROM results WHERE semester={s[0]}')
    count = cur.fetchone()[0]
    print(f'  Sem {s[0]}: {count} records')

print('\nRecent 20 records (any semester):')
cur.execute('SELECT student_usn, subject_code, semester, total_marks, scraped_at FROM results ORDER BY scraped_at DESC LIMIT 20')
rows = cur.fetchall()
for u, sc, sem, t, scraped in rows:
    print(f'  {u} | {sc} | Sem {sem} | {t} | {scraped}')

cur.close()
close_connection(conn)
