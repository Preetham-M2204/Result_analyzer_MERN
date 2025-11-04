"""
Import Semester 3 dataset Excel into MySQL 'results' table.

Expected Excel layout (as you shared):
Row1 headers: USN, Name, Overall FCD, Average, <Subject Title (CODE)>, ...
Row2 headers: (blank for first four), then repeating IA, EA, Total for each subject.

Usage:
  python import_sem3_excel_to_db.py <excel_path_optional>
If not provided, defaults to 'semester_3_analysis.xlsx' in this folder.
"""
from __future__ import annotations

import re
import sys
from typing import Dict, List, Tuple, Any
import pandas as pd
from datetime import datetime

from db_config import get_db_connection, close_connection

DEFAULT_PATH = r"d:\preetham\scrapper\Preetham version\utils\semester_3_analysis.xlsx"
SEMESTER = 3

# Simple pass/fail rule (adjust if needed)
PASS_THRESHOLD = 40


def _read_excel(path: str) -> pd.DataFrame:
    # Header is two rows
    df = pd.read_excel(path, header=[0, 1])
    return df


def _normalize_columns(cols: pd.MultiIndex) -> List[Tuple[str, str]]:
    norm: List[Tuple[str, str]] = []
    for top, sub in cols:
        top = str(top).strip()
        sub = str(sub).strip() if str(sub) != 'nan' else ''
        norm.append((top, sub))
    return norm


def _extract_subject_code(title: str) -> str | None:
    # Expect something like 'MATHEMATICS ... (BCS301)'
    m = re.search(r"\(([A-Z0-9]+)\)\s*$", title)
    return m.group(1) if m else None


def _build_subject_map(norm_cols: List[Tuple[str, str]]) -> Dict[str, Dict[str, int]]:
    mapping: Dict[str, Dict[str, int]] = {}
    for idx, (top, sub) in enumerate(norm_cols):
        code = _extract_subject_code(top)
        if not code:
            continue
        sub_up = sub.upper()
        if code not in mapping:
            mapping[code] = {}
        if sub_up in {"IA", "EA", "TOTAL"}:
            mapping[code][sub_up] = idx
    return mapping


def _find_simple_col(norm_cols: List[Tuple[str, str]], name: str) -> int:
    for i, (top, sub) in enumerate(norm_cols):
        if top.strip().upper() == name.upper():
            return i
    raise KeyError(f"Column not found: {name}")


def import_sem3(path: str = DEFAULT_PATH) -> None:
    df = _read_excel(path)
    norm_cols = _normalize_columns(df.columns)

    # Identify USN and Name columns
    col_usn = _find_simple_col(norm_cols, "USN")
    col_name = _find_simple_col(norm_cols, "Name")

    subj_map = _build_subject_map(norm_cols)
    if not subj_map:
        raise RuntimeError("No subject columns detected. Ensure the header row contains '(CODE)' suffixes.")

    # Prepare DB
    conn = get_db_connection()
    if not conn:
        raise SystemExit("DB connection failed")
    try:
        cur = conn.cursor()

        # Collect USNs in this sheet to avoid duplicates on re-run
        usns: List[str] = []
        for _, row in df.iterrows():
            usn = str(row.iloc[col_usn]).strip().upper()
            if usn:
                usns.append(usn)
        usns = list(dict.fromkeys(usns))  # dedupe, keep order

        # Delete existing results for these USNs for semester 3 (idempotent import)
        if usns:
            # Chunk delete to avoid large IN clause
            CHUNK = 200
            for i in range(0, len(usns), CHUNK):
                chunk = usns[i : i + CHUNK]
                placeholders = ",".join(["%s"] * len(chunk))
                cur.execute(
                    f"DELETE FROM results WHERE semester = %s AND student_usn IN ({placeholders})",
                    tuple([SEMESTER] + chunk),
                )
            conn.commit()
            print(f"🧹 Cleared previous results for {len(usns)} students (semester {SEMESTER}).")

        insert_sql = (
            """
            INSERT INTO results
                (student_usn, subject_code, semester, internal_marks, external_marks, total_marks, result_status, attempt_number, scraped_at)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
        )

        inserted = 0
        skipped_no_student = 0

        # Verify students exist to satisfy FK constraint; fetch all existing USNs
        cur.execute("SELECT usn FROM student_details")
        existing = {u for (u,) in cur.fetchall()}

        for _, row in df.iterrows():
            usn = str(row.iloc[col_usn]).strip().upper()
            name_val = str(row.iloc[col_name]).strip()
            if not usn:
                continue
            if usn not in existing:
                skipped_no_student += 1
                print(f"⚠️  Skipping {usn} ({name_val}) – not found in student_details.")
                continue

            for code, m in subj_map.items():
                ia = row.iloc[m.get("IA", -1)] if m.get("IA") is not None else None
                ea = row.iloc[m.get("EA", -1)] if m.get("EA") is not None else None
                tot = row.iloc[m.get("TOTAL", -1)] if m.get("TOTAL") is not None else None

                def _to_int(x: Any) -> int | None:
                    try:
                        if pd.isna(x):
                            return None
                        s = str(x).strip()
                        if s == "":
                            return None
                        return int(float(s))
                    except Exception:
                        return None

                ia_i = _to_int(ia)
                ea_i = _to_int(ea)
                tot_i = _to_int(tot)
                if tot_i is None and (ia_i is not None or ea_i is not None):
                    tot_i = (ia_i or 0) + (ea_i or 0)

                if ia_i is None and ea_i is None and tot_i is None:
                    # No data found for this subject in this row
                    continue

                status = None
                if tot_i is not None:
                    status = "P" if tot_i >= PASS_THRESHOLD else "F"

                cur.execute(
                    insert_sql,
                    (
                        usn,
                        code,
                        SEMESTER,
                        ia_i if ia_i is not None else 0,
                        ea_i if ea_i is not None else 0,
                        tot_i if tot_i is not None else 0,
                        status,
                        1,
                        datetime.now(),
                    ),
                )
                inserted += 1
        conn.commit()
        print(f"✅ Inserted {inserted} result rows for Semester {SEMESTER}. Skipped students missing in DB: {skipped_no_student}.")
    finally:
        close_connection(conn)


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    import_sem3(path)
