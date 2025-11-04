"""
Diagnostic script to list 1BI21IS% students and which semesters they have results for.
"""
from db_config import get_db_connection, close_connection

def is_diploma(usn):
    import re
    m = re.search(r'(\d{3})$', usn)
    if m:
        rn = int(m.group(1))
        return 400 <= rn <= 499
    return False

def main():
    conn = get_db_connection()
    if not conn:
        print('Could not connect to DB')
        return
    cur = conn.cursor()

    cur.execute("SELECT usn, name FROM student_details WHERE usn LIKE %s ORDER BY usn", ('1BI21IS%',))
    students = cur.fetchall()
    total = len(students)
    print(f'Total students matching 1BI21IS%: {total}')

    # For each student list semesters present and total result rows
    missing_sem_report = {}
    counts = {i:0 for i in range(1,9)}
    any_result_count = 0

    for usn, name in students:
        cur.execute("SELECT DISTINCT semester FROM results WHERE student_usn = %s ORDER BY semester", (usn,))
        sems = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM results WHERE student_usn=%s", (usn,))
        rows = cur.fetchone()[0]
        if rows > 0:
            any_result_count += 1
        for s in sems:
            if isinstance(s, int) and 1 <= s <= 8:
                counts[s] += 1
        missing = [s for s in range(1,9) if s not in sems]
        missing_sem_report[usn] = {'name': name, 'sems': sems, 'rows': rows, 'diploma': is_diploma(usn), 'missing': missing}

    print('\nSummary of semesters presence (counts of students having at least one row in that semester):')
    for s in range(1,9):
        print(f'  Sem {s}: {counts[s]}')
    print(f'\nStudents with any result rows: {any_result_count} / {total}')

    # List students with no rows at all
    no_rows = [u for u,v in missing_sem_report.items() if v['rows']==0]
    print(f'\nStudents with ZERO result rows: {len(no_rows)}')
    if no_rows:
        print('  ' + ', '.join(no_rows))

    # Show students that appear to be diploma (diploma flag) and their semesters
    diplomas = [u for u,v in missing_sem_report.items() if v['diploma']]
    print(f'\nDiploma-count: {len(diplomas)}')
    if diplomas:
        print('Diploma USNs and semesters present:')
        for u in diplomas:
            v = missing_sem_report[u]
            print(f"  {u}: rows={v['rows']} sems={v['sems']}")

    # Print students that have results for ALL sems 3-8? or none
    print('\nStudents with no sem >=3 rows:')
    for u,v in missing_sem_report.items():
        if all(s not in v['sems'] for s in range(3,9)):
            print(f"  {u}: diploma? {v['diploma']} rows={v['rows']} sems={v['sems']}")

    cur.close()
    close_connection(conn)

if __name__=='__main__':
    main()
