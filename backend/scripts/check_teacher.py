import mysql.connector
from db_config import DB_CONFIG

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Check if teacher T-001 exists
    cursor.execute("SELECT teacher_id, teacher_name FROM teachers WHERE teacher_id = 'T-001'")
    result = cursor.fetchone()
    
    if result:
        print(f"✅ Teacher T-001 found:")
        print(f"   ID: {result[0]}")
        print(f"   Name: {result[1]}")
    else:
        print("❌ Teacher T-001 NOT FOUND in teachers table")
        print("\n📋 All teachers in database:")
        cursor.execute("SELECT teacher_id, teacher_name FROM teachers ORDER BY teacher_id")
        teachers = cursor.fetchall()
        for t in teachers:
            print(f"   {t[0]} - {t[1]}")
    
    # Check assignments
    print("\n📚 Checking assignments for T-001:")
    cursor.execute("SELECT subject_code, batch, section FROM teacher_subject_assignments WHERE teacher_id = 'T-001'")
    assignments = cursor.fetchall()
    if assignments:
        print(f"   Found {len(assignments)} assignment(s):")
        for a in assignments:
            print(f"   - {a[0]} | Batch: {a[1]} | Section: {a[2]}")
    else:
        print("   ❌ No assignments found for T-001")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
