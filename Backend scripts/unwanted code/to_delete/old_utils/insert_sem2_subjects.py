"""
Insert Semester 2 Subjects into MySQL 'subjects' table.
Based on VTU 2022 Scheme - Semester 2 (CSE Streams - Physics Group)
Run from this folder:
  python insert_sem2_subjects.py
"""

from typing import List, Dict
from db_config import get_db_connection, close_connection

SEM2_SUBJECTS: List[Dict] = [
    # Core Mathematics
    {"subject_code": "BMATS201", "subject_name": "MATHEMATICS-II FOR CSE STREAM", "semester": 2, "credits": 4, "short_code": "MATS201"},
    
    # Chemistry
    {"subject_code": "BCHES202", "subject_name": "APPLIED CHEMISTRY FOR CSE STREAM", "semester": 2, "credits": 4, "short_code": "CHES202"},
    
    # Computer-Aided Engineering Drawing
    {"subject_code": "BCEDK203", "subject_name": "COMPUTER-AIDED ENGINEERING DRAWING", "semester": 2, "credits": 3, "short_code": "CEDK203"},
    
    # Professional Writing Skills in English
    {"subject_code": "BPWSK206", "subject_name": "PROFESSIONAL WRITING SKILLS IN ENGLISH", "semester": 2, "credits": 1, "short_code": "PWSK206"},
    
    # Indian Constitution
    {"subject_code": "BICOK207", "subject_name": "INDIAN CONSTITUTION", "semester": 2, "credits": 1, "short_code": "ICOK207"},
    
    # Scientific Foundations for Health
    {"subject_code": "BSFHK258", "subject_name": "SCIENTIFIC FOUNDATIONS OF HEALTH", "semester": 2, "credits": 1, "short_code": "SFHK258"},
    
    # Programming Language Course - Introduction to Python Programming (PLC option)
    {"subject_code": "BPLCK205B", "subject_name": "INTRODUCTION TO PYTHON PROGRAMMING", "semester": 2, "credits": 3, "short_code": "PLCK205B"},
    
    # Engineering Science Course - Introduction to Electronics Communication (ESC option)
    {"subject_code": "BESCK204C", "subject_name": "INTRODUCTION TO ELECTRONICS COMMUNICATION", "semester": 2, "credits": 3, "short_code": "ESCK204C"},
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


def insert_sem2_subjects():
    conn = get_db_connection()
    if not conn:
        raise SystemExit("Could not connect to DB")
    try:
        cur = conn.cursor()
        ok = 0
        for s in SEM2_SUBJECTS:
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
        print(f"✅ Done. Upserted {ok} Semester 2 subjects.")
        print(f"   Note: This includes only the common subjects seen in your result.")
        print(f"   Electives like ESC/PLC vary per student - scraper will handle them.")
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
        cursor.execute("SELECT COUNT(*) FROM subjects WHERE semester = 2")
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Total Semester 2 subjects in database: {count}")
        
        # Show all subjects
        cursor.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 2 ORDER BY subject_code")
        subjects = cursor.fetchall()
        
        print("\n📋 Semester 2 Subjects:")
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
    print("🚀 VTU RESULTS SCRAPER - SEMESTER 2 SUBJECT INSERTION")
    print("="*80)
    print()
    insert_sem2_subjects()
    verify_insertion()
