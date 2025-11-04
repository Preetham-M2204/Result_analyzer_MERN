"""
insert_subjects_from_file.py

Read a subject list from an Excel (.xlsx/.xls) or CSV file and insert (upsert)
rows into the `subjects` table in the database. The script is flexible about
column names and will try to detect the useful columns automatically.

Usage:
    python insert_subjects_from_file.py subjects.xlsx
    python insert_subjects_from_file.py subjects.csv --sheet "Semester1"

Expected columns (case-insensitive, any of these names will be accepted):
  - subject_code, code
  - subject_name, name, title
  - semester, sem
  - credits, credit
  - short_code (optional)

If credits column is missing the script will insert 0 for credits and warn.

Requires: pandas, openpyxl (for .xlsx) and the project's DB connector (mysql-connector-python).
"""

import sys
import os
import argparse
from db_config import get_db_connection, close_connection

try:
    import pandas as pd
except ImportError:
    print("❌ pandas is required. Install with: pip install pandas openpyxl")
    sys.exit(1)


def detect_column(cols, candidates):
    cols_lower = {c.lower(): c for c in cols}
    for cand in candidates:
        if cand.lower() in cols_lower:
            return cols_lower[cand.lower()]
    return None


def load_file(path, sheet=None):
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.xls', '.xlsx'):
        df = pd.read_excel(path, sheet_name=sheet)
    elif ext in ('.csv', '.txt'):
        df = pd.read_csv(path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    return df


def upsert_subjects_from_df(df, dry_run=False):
    # Identify columns
    cols = list(df.columns)
    code_col = detect_column(cols, ['subject_code', 'code', 'Subject Code', 'SubjectCode'])
    name_col = detect_column(cols, ['subject_name', 'name', 'title', 'Subject Name', 'SubjectName'])
    sem_col = detect_column(cols, ['semester', 'sem'])
    credits_col = detect_column(cols, ['credits', 'credit'])
    short_col = detect_column(cols, ['short_code', 'shortcode', 'short'])

    if not code_col or not name_col or not sem_col:
        print("❌ Required columns not found. Need at least subject_code, subject_name and semester.")
        print("Detected columns:", cols)
        return 0

    rows = []
    for _, r in df.iterrows():
        subject_code = str(r.get(code_col)).strip()
        subject_name = str(r.get(name_col)).strip()
        semester = r.get(sem_col)
        try:
            semester = int(semester)
        except Exception:
            semester = None

        credits = None
        if credits_col:
            try:
                credits = int(r.get(credits_col))
            except Exception:
                credits = None

        short_code = None
        if short_col:
            short_code = str(r.get(short_col)).strip()

        if not subject_code or subject_code.lower() in ('nan', 'none'):
            continue

        if semester is None:
            print(f"⚠️  Skipping {subject_code} - semester not detected")
            continue

        if credits is None:
            credits = 0
            print(f"⚠️  Credits missing for {subject_code}; inserting 0 credits. You can update later.")

        rows.append((subject_code, subject_name, semester, credits, short_code))

    if dry_run:
        print(f"Dry-run: would upsert {len(rows)} subjects")
        for r in rows:
            print(r)
        return len(rows)

    conn = get_db_connection()
    if not conn:
        return 0
    cur = conn.cursor()

    upsert_q = (
        "INSERT INTO subjects (subject_code, subject_name, semester, credits, short_code) "
        "VALUES (%s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), semester = VALUES(semester), credits = VALUES(credits), short_code = VALUES(short_code)"
    )

    inserted = 0
    for data in rows:
        try:
            cur.execute(upsert_q, data)
            inserted += 1
        except Exception as e:
            print(f"❌ Error inserting {data[0]}: {e}")

    conn.commit()
    cur.close()
    close_connection(conn)

    print(f"✅ Upserted {inserted} subjects into `subjects` table")
    return inserted


def main():
    parser = argparse.ArgumentParser(description='Insert/Upsert subjects from Excel/CSV into DB')
    parser.add_argument('file', help='Path to .xlsx / .xls / .csv file containing subjects')
    parser.add_argument('--sheet', help='Excel sheet name or index (optional)', default=None)
    parser.add_argument('--dry-run', action='store_true', help='Do not write to DB, just show what would be done')
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        sys.exit(1)

    try:
        df = load_file(args.file, sheet=args.sheet)
    except Exception as e:
        print(f"❌ Failed to read file: {e}")
        sys.exit(1)

    count = upsert_subjects_from_df(df, dry_run=args.dry_run)
    print(f"Done. Processed {count} rows.")


if __name__ == '__main__':
    main()
