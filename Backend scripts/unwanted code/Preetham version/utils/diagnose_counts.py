"""
Additional diagnostics: counts by scheme and list of USNs matching 1BI21IS4%
"""
from db_config import get_db_connection, close_connection

def main():
    conn = get_db_connection()
    if not conn:
        print('DB connect failed')
        return
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM student_details")
    total = cur.fetchone()[0]
    print('Total students in student_details:', total)

    cur.execute("SELECT COUNT(*) FROM student_details WHERE scheme='21'")
    s21 = cur.fetchone()[0]
    print('Students with scheme=21:', s21)

    cur.execute("SELECT COUNT(*) FROM student_details WHERE usn LIKE '1BI21IS%'")
    p = cur.fetchone()[0]
    print("Students with USN like 1BI21IS%:", p)

    cur.execute("SELECT usn FROM student_details WHERE usn LIKE '1BI21IS4%' ORDER BY usn")
    rows = cur.fetchall()
    print('\nList of USNs matching 1BI21IS4% (maybe diploma pattern):')
    if rows:
        for r in rows:
            print(' ', r[0])
    else:
        print('  (none)')

    cur.close()
    close_connection(conn)

if __name__=='__main__':
    main()
