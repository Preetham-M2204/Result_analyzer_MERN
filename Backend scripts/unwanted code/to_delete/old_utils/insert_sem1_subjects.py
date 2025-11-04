"""
Insert Semester 1 Subjects into MySQL 'subjects' table.
Based on VTU 2022 Scheme - Semester 1 (CSE Streams - Physics Group)
Run from this folder:
  python insert_sem1_subjects.py
"""

from typing import List, Dict
from db_config import get_db_connection, close_connection

SEM1_SUBJECTS: List[Dict] = [
    # Core Mathematics
    {"subject_code": "BMATS101", "subject_name": "MATHEMATICS FOR CSE STREAM-I", "semester": 1, "credits": 4, "short_code": "MATS101"},
    
    # Physics
    {"subject_code": "BPHYS102", "subject_name": "PHYSICS FOR CSE STREAM", "semester": 1, "credits": 4, "short_code": "PHYS102"},
    
    # Programming
    {"subject_code": "BPOPS103", "subject_name": "PRINCIPLES OF PROGRAMMING USING C", "semester": 1, "credits": 3, "short_code": "POPS103"},
    
    # Communicative English
    {"subject_code": "BENGK106", "subject_name": "COMMUNICATIVE ENGLISH", "semester": 1, "credits": 1, "short_code": "ENGK106"},
    
    # Kannada - Students choose ONE of these two:
    # Option 1: Balake Kannada
    {"subject_code": "BKBKK107", "subject_name": "BALAKE KANNADA", "semester": 1, "credits": 1, "short_code": "KBKK107"},
    
    # Option 2: Samskrutika Kannada
    {"subject_code": "BKSKK107", "subject_name": "SAMSKRUTIKA KANNADA", "semester": 1, "credits": 1, "short_code": "KSKK107"},
    
    # Innovation and Design Thinking
    {"subject_code": "BIDTK158", "subject_name": "INNOVATION AND DESIGN THINKING", "semester": 1, "credits": 1, "short_code": "IDTK158"},
    
    # Engineering Science Course - Introduction to Electrical Engineering (ESC option)
    {"subject_code": "BESCK104B", "subject_name": "INTRODUCTION TO ELECTRICAL ENGINEERING", "semester": 1, "credits": 3, "short_code": "ESCK104B"},
    
    # Emerging Technology Course - Introduction to IoT (ETC option)
    {"subject_code": "BETCK105H", "subject_name": "INTRODUCTION TO INTERNET OF THINGS (IOT)", "semester": 1, "credits": 3, "short_code": "ETCK105H"},
]

INSERT_SQL = (
    """
    INSERT INTO subjects (subject_code, subject_name, semester, credits, short_code)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        subject_name = VALUES(subject_name),
        semester = VALUES(semester),
        credits = VALUES(credits),
        short_code = VALUES(short_code)
    """
)


def insert_sem1_subjects():
    conn = get_db_connection()
    if not conn:
        raise SystemExit("Could not connect to DB")
    try:
        cur = conn.cursor()
        ok = 0
        for s in SEM1_SUBJECTS:
            cur.execute(
                INSERT_SQL,
                (
                    s["subject_code"],
                    s["subject_name"],
                    s["semester"],
                    s["credits"],
                    s["short_code"],
                ),
            )
            ok += 1
            print(f"✅ Upserted: {s['subject_code']} - {s['subject_name']} ({s['credits']} credits)")
        conn.commit()
        print(f"\n{'='*80}")
        print(f"✅ Done. Upserted {ok} Semester 1 subjects.")
        print(f"   Note: This includes only the common subjects seen in your result.")
        print(f"   Electives like ESC/ETC/PLC vary per student - scraper will handle them.")
        print(f"{'='*80}")
    finally:
        close_connection(conn)


def verify_insertion():
    """Verify that subjects were inserted correctly"""
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM subjects WHERE semester = 1")
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Total Semester 1 subjects in database: {count}")
        
        # Show all subjects
        cursor.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 1 ORDER BY subject_code")
        subjects = cursor.fetchall()
        
        print("\n📋 Semester 1 Subjects:")
        print("-" * 100)
        for subject in subjects:
            print(f"Code: {subject[0]:<12} Name: {subject[1]:<60} Credits: {subject[2]}")
        print("-" * 100)
        
        cursor.close()
        close_connection(connection)
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")


if __name__ == "__main__":
    print("="*80)
    print("🚀 VTU RESULTS SCRAPER - SEMESTER 1 SUBJECT INSERTION")
    print("="*80)
    print()
    insert_sem1_subjects()
    verify_insertion()
