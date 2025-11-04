from db_config import get_db_connection, close_connection
conn = get_db_connection()
cur = conn.cursor()
cur.execute('SELECT COUNT(DISTINCT student_usn) FROM results WHERE semester=8')
students = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM results WHERE semester=8')
records = cur.fetchone()[0]
print(f'Semester 8 - Students: {students}')
print(f'Semester 8 - Records: {records}')
cur.close()
close_connection(conn)
