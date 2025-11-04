"""
Compute semester-wise SGPA and CGPA and store results in the database.

Assumptions and grading rules:
- Grade points mapping (based on total marks out of 100):
  90-100 -> 10
  80-89  -> 9
  70-79  -> 8
  60-69  -> 7
  50-59  -> 6
  40-49  -> 5
  <40    -> 0

SGPA for a semester = sum(credit_i * grade_point_i) / sum(credit_i)
CGPA = mean(SGPA across semesters for the student)

This script will:
- compute SGPA for every (student, semester) present in `results`
- upsert rows into `student_semester_summary`
- compute CGPA and update `student_details.cgpa`

Run: python compute_sgpa.py
"""

from db_config import get_db_connection, close_connection
from statistics import mean

def grade_point(total_marks):
    try:
        m = int(total_marks)
    except Exception:
        return 0
    if m >= 90:
        return 10
    if m >= 80:
        return 9
    if m >= 70:
        return 8
    if m >= 60:
        return 7
    if m >= 50:
        return 6
    if m >= 40:
        return 5
    return 0

def compute_all_sgpa():
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor()

    # Get all distinct student-semester pairs from results
    cursor.execute("SELECT DISTINCT student_usn, semester FROM results ORDER BY student_usn, semester")
    pairs = cursor.fetchall()

    processed = 0
    for student_usn, semester in pairs:
        # Join results with subjects to get credits and total_marks
        query = ("SELECT r.subject_code, r.total_marks, s.credits "
                 "FROM results r "
                 "LEFT JOIN subjects s ON r.subject_code = s.subject_code "
                 "WHERE r.student_usn = %s AND r.semester = %s")
        cursor.execute(query, (student_usn, semester))
        rows = cursor.fetchall()

        numerator = 0.0
        denom = 0
        missing_subjects = []
        for subject_code, total_marks, credits in rows:
            if credits is None:
                missing_subjects.append(subject_code)
                continue
            gp = grade_point(total_marks)
            numerator += gp * credits
            denom += credits

        if denom == 0:
            print(f"⚠️  Skipping {student_usn} sem {semester}: no credit info (missing subjects: {missing_subjects})")
            continue

        sgpa = round(numerator / denom, 2)

        # Upsert into student_semester_summary
        upsert = ("INSERT INTO student_semester_summary (student_usn, semester, sgpa) "
                  "VALUES (%s, %s, %s) "
                  "ON DUPLICATE KEY UPDATE sgpa = VALUES(sgpa)")
        cursor.execute(upsert, (student_usn, semester, sgpa))
        conn.commit()

        processed += 1
        print(f"✅ {student_usn} sem {semester} -> SGPA: {sgpa} (credits: {denom})")

    # Now compute CGPA per student as mean of SGPAs
    cursor.execute("SELECT DISTINCT student_usn FROM student_semester_summary")
    students = [r[0] for r in cursor.fetchall()]

    for usn in students:
        cursor.execute("SELECT sgpa FROM student_semester_summary WHERE student_usn = %s", (usn,))
        sgpas = [r[0] for r in cursor.fetchall()]
        if not sgpas:
            continue
        cgpa_val = round(mean(sgpas), 2)
        try:
            cursor.execute("UPDATE student_details SET cgpa = %s WHERE usn = %s", (cgpa_val, usn))
            conn.commit()
            print(f"🔄 Updated CGPA for {usn} -> {cgpa_val}")
        except Exception as e:
            print(f"❌ Error updating CGPA for {usn}: {e}")

    cursor.close()
    close_connection(conn)
    print(f"\n📊 Completed SGPA computation for {processed} student-semester pairs.")

if __name__ == '__main__':
    print("🔍 Computing SGPA and CGPA for all students...")
    compute_all_sgpa()
