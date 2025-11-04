"""
Insert Semester 4 Subjects into MySQL 'subjects' table.
Based on the VTU curriculum table shared in the screenshot.
Run from this folder:
  python insert_sem4_subjects.py
"""

from typing import List, Dict
from db_config import get_db_connection, close_connection

SEM4_SUBJECTS: List[Dict] = [
    {"subject_code": "BCS401", "subject_name": "ANALYSIS & DESIGN OF ALGORITHMS", "semester": 4, "credits": 3, "short_code": "401"},
    {"subject_code": "BIS402", "subject_name": "ADVANCED JAVA", "semester": 4, "credits": 4, "short_code": "402"},
    {"subject_code": "BCS403", "subject_name": "DATABASE MANAGEMENT SYSTEMS", "semester": 4, "credits": 4, "short_code": "403"},
    {"subject_code": "BCSL404", "subject_name": "ANALYSIS & DESIGN OF ALGORITHMS LAB", "semester": 4, "credits": 1, "short_code": "L404"},
    # Institute-selected course in screenshot is shown as BCS405x; per attachment we will use BCS405A (Discrete Mathematical Structures)
    {"subject_code": "BCS405A", "subject_name": "DISCRETE MATHEMATICAL STRUCTURES", "semester": 4, "credits": 3, "short_code": "405A"},
    # Ability Enhancement Course/Skill Enhancement Course
    {"subject_code": "BCS456C", "subject_name": "UI/UX", "semester": 4, "credits": 1, "short_code": "456C"},
    {"subject_code": "BBOC407", "subject_name": "BIOLOGY FOR COMPUTER ENGINEERS", "semester": 4, "credits": 3, "short_code": "407"},
    {"subject_code": "BUHK408", "subject_name": "UNIVERSAL HUMAN VALUES COURSE", "semester": 4, "credits": 1, "short_code": "408"},
    {"subject_code": "BNSK459", "subject_name": "NATIONAL SERVICE SCHEME (NSS)", "semester": 4, "credits": 0, "short_code": "NSK459"},
    {"subject_code": "BPEK459", "subject_name": "PHYSICAL EDUCATION (PE) (Sports and Athletics)", "semester": 4, "credits": 0, "short_code": "K459"},
    {"subject_code": "BYOK459", "subject_name": "YOGA", "semester": 4, "credits": 0, "short_code": "YOK459"},
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


def insert_sem4_subjects():
    conn = get_db_connection()
    if not conn:
        raise SystemExit("Could not connect to DB")
    try:
        cur = conn.cursor()
        ok = 0
        for s in SEM4_SUBJECTS:
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
            print(f"✅ Upserted: {s['subject_code']} - {s['subject_name']}")
        conn.commit()
        print(f"\nDone. Upserted {ok} Semester 4 subjects.")
    finally:
        close_connection(conn)


if __name__ == "__main__":
    insert_sem4_subjects()
