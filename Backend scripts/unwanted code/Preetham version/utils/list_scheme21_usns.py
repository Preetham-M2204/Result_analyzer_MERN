"""
List all USNs with scheme=21 and show which match 1BI21IS% pattern
"""
from db_config import get_db_connection, close_connection
import re

def main():
    conn = get_db_connection()
    if not conn:
        print('DB connect failed')
        return
    cur = conn.cursor()
    cur.execute("SELECT usn, name FROM student_details WHERE scheme='21' ORDER BY usn")
    rows = cur.fetchall()
    print('Total scheme=21:', len(rows))
    not_match = []
    for usn, name in rows:
        if not re.match(r'^1BI21IS', usn):
            not_match.append((usn, name))
    print('\nStudents with scheme=21 but USN NOT matching 1BI21IS%:')
    for u,n in not_match:
        print(' ', u, '-', n)
    if not not_match:
        print('  (none)')
    cur.close()
    close_connection(conn)

if __name__=='__main__':
    main()
