"""
Export VTU Results to Excel in custom dataset format
- Supports Semester 3 (existing scraped data)
- Supports Semester 4 (new results link) using subject list from screenshot

Output format columns:
USN, Name, Overall FCD, Average, then for each subject: IA, EA, Total

Notes/assumptions:
- Overall FCD is computed as:
  * "Fail" if any subject has result_status not equal to 'P'
  * otherwise "FCD" if Average >= 70, else "Pass"
- Average is the arithmetic mean of Total across the subjects present in the header
  with non-null Total values; zero-credit activity subjects like NSS/Yoga/PE can be
  included or excluded by header choice per semester below.
- The script reads from MySQL tables: student_details(usn, name) and results
  (student_usn, subject_code, semester, internal_marks, external_marks, total_marks, result_status).

Run examples (from this folder):
  - python export_results_excel.py 3 d:\path\to\semester_3_analysis.xlsx
  - python export_results_excel.py 4 d:\path\to\semester_4_analysis.xlsx
"""

import sys
from collections import defaultdict
from typing import Dict, List, Tuple
import pandas as pd

from db_config import get_db_connection, close_connection

# ---------- Subject definitions and column order ----------
# Each entry: (Subject Header, Subject Code)
SEM3_COLUMNS: List[Tuple[str, str]] = [
    ("MATHEMATICS FOR COMPUTER SCIENCE (BCS301)", "BCS301"),
    ("DATA VISUALIZATION WITH PYTHON (BCS358D)", "BCS358D"),
    ("DIGITAL DESIGN & COMPUTER ORGANIZATION (BCS302)", "BCS302"),
    ("OBJECT ORIENTED PROGRAMMING WITH JAVA (BCS306A)", "BCS306A"),
    ("YOGA (BYOK359)", "BYOK359"),
    ("DATA STRUCTURES LAB (BCSL305)", "BCSL305"),
    ("OPERATING SYSTEMS (BCS303)", "BCS303"),
    ("SOCIAL CONNECT AND RESPONSIBILITY (BSCK307)", "BSCK307"),
    ("PHYSICAL EDUCATION (BPEK359)", "BPEK359"),
    ("DATA STRUCTURES AND APPLICATIONS (BCS304)", "BCS304"),
    ("NATIONAL SERVICE SCHEME (BNSK359)", "BNSK359"),
]

# Semester 4 per screenshot
SEM4_COLUMNS: List[Tuple[str, str]] = [
    ("ANALYSIS & DESIGN OF ALGORITHMS (BCS401)", "BCS401"),
    ("ADVANCED JAVA (BIS402)", "BIS402"),
    ("DATABASE MANAGEMENT SYSTEMS (BCS403)", "BCS403"),
    ("ANALYSIS & DESIGN OF ALGORITHMS LAB (BCSL404)", "BCSL404"),
    ("BIOLOGY FOR COMPUTER ENGINEERS (BBOC407)", "BBOC407"),
    ("UNIVERSAL HUMAN VALUES COURSE (BUHK408)", "BUHK408"),
    ("PHYSICAL EDUCATION (BPEK459)", "BPEK459"),
    ("DISCRETE MATHEMATICAL STRUCTURES (BCS405A)", "BCS405A"),
    ("UI/UX (BCS456C)", "BCS456C"),
]

SEM_SUBJECTS: Dict[int, List[Tuple[str, str]]] = {3: SEM3_COLUMNS, 4: SEM4_COLUMNS}


def _make_header(sem: int) -> List[str]:
    header: List[str] = ["USN", "Name", "Overall FCD", "Average"]
    for title, _ in SEM_SUBJECTS[sem]:
        header.extend([f"{title}", "IA", "EA", "Total"])  # merged later by Excel users
    # The header we produce is single-row wide with repeating triplets labelled under each subject title.
    return header


def _fetch_students(sem: int):
    conn = get_db_connection()
    if not conn:
        raise RuntimeError("Failed to connect to database")
    try:
        cur = conn.cursor()
        # Pull all students that have at least one result for this semester
        cur.execute(
            """
            SELECT DISTINCT s.usn, s.name
            FROM student_details s
            JOIN results r ON r.student_usn = s.usn
            WHERE r.semester = %s
            ORDER BY s.usn
            """,
            (sem,),
        )
        students = cur.fetchall()
        # Fetch all results for this semester in one go
        cur.execute(
            """
            SELECT student_usn, subject_code, internal_marks, external_marks, total_marks, result_status
            FROM results
            WHERE semester = %s
            """,
            (sem,),
        )
        result_rows = cur.fetchall()
        return students, result_rows
    finally:
        close_connection(conn)


def _pivot_results(result_rows) -> Dict[str, Dict[str, Tuple[int, int, int, str]]]:
    """Return mapping student_usn -> subject_code -> (IA, EA, Total, Status)."""
    data: Dict[str, Dict[str, Tuple[int, int, int, str]]] = defaultdict(dict)
    for usn, code, ia, ea, tot, status in result_rows:
        data[usn][code] = (ia or 0, ea or 0, tot or ((ia or 0) + (ea or 0)), status or "")
    return data


def _compute_overall_and_average(sem: int, subj_triplets: List[Tuple[int, int, int, str]]) -> Tuple[str, float]:
    """Compute Overall and Average.
    - Average = mean of totals across non-empty subjects that are present in the header list for this sem.
    - Overall = Fail if any status not 'P'; otherwise FCD if avg >= 70 else Pass.
    """
    totals = [tot for ia, ea, tot, st in subj_triplets if tot is not None]
    avg = round(sum(totals) / len(totals), 8) if totals else 0.0
    overall = "FCD"
    if any((st or "").upper() != 'P' for ia, ea, tot, st in subj_triplets if tot is not None):
        overall = "Fail"
    elif avg < 70:
        overall = "Pass"
    return overall, avg


def export_semester(sem: int, outfile: str) -> str:
    if sem not in SEM_SUBJECTS:
        raise ValueError(f"Unsupported semester: {sem}")

    # Fetch data
    students, result_rows = _fetch_students(sem)
    results_map = _pivot_results(result_rows)

    subject_order = SEM_SUBJECTS[sem]

    rows: List[List] = []
    header = _make_header(sem)

    for usn, name in students:
        # Build subject triplets in our fixed order
        triplets: List[Tuple[int, int, int, str]] = []
        flat_cells: List = [usn, name]
        # Placeholder for Overall & Average; fill later
        flat_cells.extend([None, None])
        for _, code in subject_order:
            ia, ea, tot, st = results_map.get(usn, {}).get(code, (None, None, None, None))
            triplets.append((ia, ea, tot, st))
            flat_cells.extend([code, ia, ea, tot])
        overall, avg = _compute_overall_and_average(sem, triplets)
        flat_cells[2] = overall
        flat_cells[3] = avg
        rows.append(flat_cells)

    # Create DataFrame and save
    df = pd.DataFrame(rows, columns=header)
    df.to_excel(outfile, index=False)
    return outfile


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python export_results_excel.py <semester: 3|4> <output_excel_path>")
        sys.exit(1)
    sem = int(sys.argv[1])
    outfile = sys.argv[2]
    path = export_semester(sem, outfile)
    print(f"✅ Exported Semester {sem} dataset to: {path}")
