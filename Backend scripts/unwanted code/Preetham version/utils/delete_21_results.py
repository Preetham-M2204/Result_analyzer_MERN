"""Delete all 21xxx subject code results"""
from db_config import get_db_connection, close_connection

conn = get_db_connection()
cur = conn.cursor()

# Count first
cur.execute('SELECT COUNT(*) FROM results WHERE subject_code LIKE "21%"')
count = cur.fetchone()[0]
print(f'Found {count} records with subject code starting with 21')

if count > 0:
    confirm = input(f'Delete all {count} records? (yes/no): ')
    if confirm.lower() == 'yes':
        cur.execute('DELETE FROM results WHERE subject_code LIKE "21%"')
        conn.commit()
        print(f'✅ Deleted {cur.rowcount} records')
    else:
        print('Cancelled')

cur.close()
close_connection(conn)
