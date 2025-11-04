from db_config import get_db_connection, close_connection

conn = get_db_connection()
cur = conn.cursor()
pattern='1BI21IS%'
cur.execute("SELECT COUNT(*) FROM student_details WHERE usn LIKE %s", (pattern,))
print('students_in_db:', cur.fetchone()[0])
cur.execute("SELECT usn, COUNT(*) FROM results WHERE student_usn LIKE %s GROUP BY usn ORDER BY usn", (pattern,))
rows = cur.fetchall()
print('students_with_results_count:', len(rows))
missing = []
cur.execute("SELECT usn FROM student_details WHERE usn LIKE %s ORDER BY usn", (pattern,))
all_usns=[r[0] for r in cur.fetchall()]
usns_with_results = {r[0]:r[1] for r in rows}
for u in all_usns:
    if u not in usns_with_results:
        missing.append(u)
print('missing_usns (no results at all):', missing)
# Check sample of diploma USNs

p = []
for u in all_usns:
    s=u[-3:]
    if s.isdigit() and 400<=int(s)<=499:
        p.append(u)
print('diploma_count:', len(p), 'sample diplomas:', p[:10])

# For diploma students, list their results per semester
print('\nDiploma results by semester:')
for u in p:
    cur.execute('SELECT semester, COUNT(*) FROM results WHERE student_usn=%s GROUP BY semester ORDER BY semester', (u,))
    print(u, cur.fetchall())

cur.close(); close_connection(conn)
print('\nDone')
